// SPDX-License-Identifier: Apache-2.0
// Qualified output adapter at the Wasm write callback. It does not remux, repair
// timestamps, or invent sample boundaries. Unqualified complete batches retain
// the existing gather path; after admission a corrupt/truncated tail is fatal.
const kind = (b, p) => String.fromCharCode(...b.subarray(p + 4, p + 8));
function boxes(b, start, end) { const v = new DataView(b.buffer, b.byteOffset, b.byteLength), out = []; for (let p = start; p < end;) {
    if (p + 8 > end || out.length > 4096)
        throw Error('Box table');
    const n = v.getUint32(p);
    if (n < 8 || p + n > end)
        throw Error('Box bounds');
    out.push({ p, n, type: kind(b, p) });
    p += n;
} return out; }
export function fragmentSamples(moof, mdatSize) {
    const v = new DataView(moof.buffer, moof.byteOffset, moof.byteLength), u = (p) => v.getUint32(p), one = (a, t) => { const found = a.filter(x => x.type === t); if (found.length !== 1)
        throw Error('Missing/ambiguous ' + t); return found[0]; };
    if (kind(moof, 0) !== 'moof' || u(0) !== moof.length || mdatSize < 8)
        throw Error('Fragment shape');
    const root = boxes(moof, 8, moof.length);
    one(root, 'mfhd');
    if (root.some(b => !['mfhd', 'traf'].includes(b.type)))
        throw Error('Fragment extensions');
    const samples = [], ids = new Set();
    for (const traf of root.filter(b => b.type === 'traf')) {
        const parts = boxes(moof, traf.p + 8, traf.p + traf.n);
        if (parts.some(b => !['tfhd', 'tfdt', 'trun'].includes(b.type)))
            throw Error('Track fragment extensions');
        const tfhd = one(parts, 'tfhd'), tfdt = one(parts, 'tfdt'), flags = u(tfhd.p + 8);
        if ((flags & ~0x020038) !== 0 || !(flags & 0x020000))
            throw Error('Nonrelative address');
        const id = u(tfhd.p + 12);
        if (!id || ids.has(id))
            throw Error('Track identity');
        ids.add(id);
        if (![0, 0x01000000].includes(u(tfdt.p + 8)) || tfdt.n !== (u(tfdt.p + 8) ? 20 : 16))
            throw Error('Decode time');
        let q = tfhd.p + 16;
        if (flags & 8)
            q += 4;
        const defaultSize = flags & 16 ? u(q) : 0;
        if (flags & 16)
            q += 4;
        if (flags & 32)
            q += 4;
        if (q !== tfhd.p + tfhd.n)
            throw Error('Track header length');
        for (const trun of parts.filter(b => b.type === 'trun')) {
            const vf = u(trun.p + 8), f = vf & 0xffffff, count = u(trun.p + 12);
            if ((vf >>> 24) > 1 || (f & ~0x000f05) !== 0 || !(f & 1) || count < 1 || samples.length + count > 65536)
                throw Error('Sample run');
            let cursor = trun.p + 16, offset = v.getInt32(cursor) - moof.length;
            cursor += 4;
            if (f & 4)
                cursor += 4;
            for (let i = 0; i < count; i++) {
                if (f & 0x100)
                    cursor += 4;
                const size = f & 0x200 ? u(cursor) : defaultSize;
                if (f & 0x200)
                    cursor += 4;
                if (f & 0x400)
                    cursor += 4;
                if (f & 0x800)
                    cursor += 4;
                if (!size || offset < 8 || offset + size > mdatSize)
                    throw Error('Sample bounds');
                samples.push([offset, offset + size]);
                offset += size;
            }
            if (cursor !== trun.p + trun.n)
                throw Error('Run length');
        }
    }
    samples.sort((a, b) => a[0] - b[0]);
    let end = 8;
    for (const [a, b] of samples) {
        if (a !== end)
            throw Error('Noncontiguous sample layout');
        end = b;
    }
    if (end !== mdatSize || !samples.length)
        throw Error('Incomplete sample map');
    return samples.map(s => s[1]);
}
export function initialProgressiveMP4(minimum = 131072, batch = 65536) { return Object.freeze({ phase: 'pending', minimum, batch, length: 0, received: 0, copiedBytes: 0, emittedBytes: 0, parts: 0, total: null, position: null, ends: Object.freeze([]) }); }
export function appendProgressiveMP4(state, bytes) { return state.phase === 'failed' ? state : Object.freeze({ ...state, length: state.length + bytes, received: state.received + bytes }); }
const result = (state, emit = 0, required = 0) => Object.freeze({ state, emit, required });
function reserve(state, bytes, position = state.position) { return bytes ? result(Object.freeze({ ...state, length: state.length - bytes, emittedBytes: state.emittedBytes + bytes, parts: state.parts + 1, position }), bytes) : result(state); }
/** Consume only bounded header observations; byte storage and output callbacks stay outside. */
export function inspectProgressiveMP4(state, header) {
    if (state.phase !== 'pending' || state.length < 8)
        return result(state);
    if (header.length < 8)
        return result(state, 0, 8);
    const size = new DataView(header.buffer, header.byteOffset, 8).getUint32(0);
    const reject = () => result(Object.freeze({ ...state, phase: 'rejected' }));
    if (kind(header, 0) !== 'moof' || size < 8 || size > 262144)
        return reject();
    if (state.length < size + 8)
        return result(state);
    if (header.length < size + 8)
        return result(state, 0, size + 8);
    const mdat = new DataView(header.buffer, header.byteOffset + size, 8).getUint32(0);
    if (kind(header, size) !== 'mdat' || mdat < state.minimum || mdat > 8 * 1024 * 1024 || state.length >= size + mdat)
        return reject();
    let ends;
    try {
        ends = fragmentSamples(header.subarray(0, size), mdat);
    }
    catch {
        return reject();
    }
    return reserve(Object.freeze({ ...state, phase: 'active', total: size + mdat, position: 8, ends: Object.freeze(ends.slice()) }), size + 8);
}
/** Advance represented sample position before handing physical bytes to a callback. */
export function advanceProgressiveMP4(state) {
    if (state.phase !== 'active' || state.position === null)
        return result(state);
    const available = state.position + state.length;
    let end;
    for (let index = state.ends.length - 1; index >= 0; index--)
        if (state.ends[index] <= available) {
            end = state.ends[index];
            break;
        }
    const bytes = (end ?? state.position) - state.position;
    return bytes >= state.batch || end === state.ends.at(-1) ? reserve(state, bytes, state.position + bytes) : result(state);
}
export function progressiveMP4BudgetError(state) { return state.phase === 'active' && state.received > 8 * 1024 * 1024 ? 'Progressive fragment budget' : null; }
export function copyProgressiveMP4(state, bytes) { return bytes ? Object.freeze({ ...state, copiedBytes: state.copiedBytes + bytes }) : state; }
export function failProgressiveMP4(state) { return state.phase === 'failed' ? state : Object.freeze({ ...state, phase: 'failed' }); }
export function finishProgressiveMP4(state, tail) {
    if (state.phase !== 'active')
        return Object.freeze({ ...result(state), active: false });
    if (state.total === null || state.received < state.total || state.position !== state.ends.at(-1))
        throw Error('Truncated progressive fragment');
    if (state.length) {
        if (tail.length !== state.length || boxes(tail, 0, tail.length).some(box => box.type !== 'mfra'))
            throw Error('Unexpected progressive fragment tail');
    }
    return Object.freeze({ ...reserve(state, state.length), active: true });
}
