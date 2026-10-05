// SPDX-License-Identifier: Apache-2.0
/** H.264 7.3.2.1 / E.1.1 / E.2.1: derive the presentation reorder bound
 * from every declared SPS. No browser sniffing or fixture-specific lookahead. */
export function videoReorderDepth(kind, description) {
    if (kind !== 1)
        return 0;
    if (!description.length || description.length > 65536)
        throw Error('AVC reorder metadata unavailable');
    const units = [];
    if (description[0] === 1) {
        if (description.length < 7)
            throw Error('Truncated avcC');
        let at = 6;
        for (let i = 0; i < (description[5] & 31); i++) {
            if (at + 2 > description.length)
                throw Error('Truncated avcC SPS');
            const n = description[at] * 256 + description[at + 1];
            at += 2;
            if (!n || at + n > description.length)
                throw Error('Truncated avcC SPS');
            units.push(description.subarray(at, at + n));
            at += n;
        }
    }
    else {
        let start = -1;
        for (let i = 0; i + 2 < description.length; i++)
            if (description[i] === 0 && description[i + 1] === 0 && description[i + 2] === 1) {
                if (start >= 0)
                    units.push(description.subarray(start, i));
                start = i + 3;
                i += 2;
            }
        if (start >= 0)
            units.push(description.subarray(start));
    }
    const sps = units.filter(unit => (unit[0] & 31) === 7);
    if (!sps.length)
        throw Error('AVC reorder SPS unavailable');
    return Math.max(...sps.map(spsReorderDepth));
}
function spsReorderDepth(nal) {
    const data = [];
    for (let i = 1; i < nal.length; i++) {
        if (i >= 3 && nal[i] === 3 && nal[i - 1] === 0 && nal[i - 2] === 0) {
            if (i + 1 >= nal.length || nal[i + 1] > 3)
                throw Error('Malformed AVC emulation prevention');
            continue;
        }
        data.push(nal[i]);
    }
    let at = 0;
    const bits = (n) => { if (at + n > data.length * 8)
        throw Error('Truncated AVC SPS'); let v = 0; while (n--)
        v = v * 2 + ((data[at >> 3] >> (7 - (at++ & 7))) & 1); return v; };
    const ue = () => { let zeros = 0; while (!bits(1)) {
        if (++zeros > 30)
            throw Error('AVC Exp-Golomb limit');
    } return 2 ** zeros - 1 + bits(zeros); };
    const se = () => { const n = ue(); return n % 2 ? (n + 1) / 2 : -n / 2; };
    const bounded = (n, max) => { if (n > max)
        throw Error('AVC syntax limit'); return n; };
    const profile = bits(8), constraints = bits(8), level = bits(8);
    bounded(ue(), 31);
    if ([100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135].includes(profile)) {
        const chroma = bounded(ue(), 3);
        if (chroma === 3)
            bits(1);
        bounded(ue(), 6);
        bounded(ue(), 6);
        bits(1);
        if (bits(1))
            for (let i = 0; i < (chroma === 3 ? 12 : 8); i++)
                if (bits(1)) {
                    let last = 8, next = 8;
                    for (let j = 0; j < (i < 6 ? 16 : 64); j++) {
                        if (next)
                            next = ((last + se()) % 256 + 256) % 256;
                        last = next || last;
                    }
                }
    }
    bounded(ue(), 12);
    const poc = bounded(ue(), 2);
    if (poc === 0)
        bounded(ue(), 12);
    else if (poc === 1) {
        bits(1);
        se();
        se();
        const count = bounded(ue(), 255);
        for (let i = 0; i < count; i++)
            se();
    }
    const refs = bounded(ue(), 16);
    bits(1);
    const width = ue() + 1, height = ue() + 1, frameOnly = bits(1);
    if (!frameOnly)
        bits(1);
    bits(1);
    if (bits(1)) {
        ue();
        ue();
        ue();
        ue();
    }
    // A.3.1/A.3.2, MaxDpbMbs. Level 1b uses constraint_set3 for these profiles.
    const limits = { 9: 396, 10: 396, 11: 900, 12: 2376, 13: 2376, 20: 2376, 21: 4752, 22: 8100, 30: 8100, 31: 18000, 32: 20480, 40: 32768, 41: 32768, 42: 34816, 50: 110400, 51: 184320, 52: 184320, 60: 696320, 61: 696320, 62: 696320 };
    const maxMbs = level === 11 && (constraints & 16) && [66, 77, 88].includes(profile) ? 396 : limits[level];
    if (!maxMbs || width * height * (2 - frameOnly) > maxMbs)
        throw Error('Unsupported AVC DPB dimensions/level');
    const maxDpb = Math.min(16, Math.floor(maxMbs / (width * height * (2 - frameOnly))));
    const inferred = [44, 86, 100, 110, 122, 244].includes(profile) && (constraints & 16) ? 0 : maxDpb;
    if (!bits(1))
        return inferred;
    if (bits(1)) {
        if (bits(8) === 255) {
            bits(16);
            bits(16);
        }
    } // aspect ratio
    if (bits(1))
        bits(1); // overscan
    if (bits(1)) {
        bits(3);
        bits(1);
        if (bits(1)) {
            bits(8);
            bits(8);
            bits(8);
        }
    }
    if (bits(1)) {
        ue();
        ue();
    } // chroma location
    if (bits(1)) {
        bits(32);
        bits(32);
        bits(1);
    }
    const hrd = () => { const count = bounded(ue(), 31); bits(4); bits(4); for (let i = 0; i <= count; i++) {
        ue();
        ue();
        bits(1);
    } bits(5); bits(5); bits(5); bits(5); };
    const nalHrd = bits(1);
    if (nalHrd)
        hrd();
    const vclHrd = bits(1);
    if (vclHrd)
        hrd();
    if (nalHrd || vclHrd)
        bits(1);
    bits(1);
    if (!bits(1))
        return inferred;
    bits(1);
    ue();
    ue();
    ue();
    ue();
    const reorder = ue(), buffering = ue();
    if (reorder > buffering || buffering > maxDpb || buffering < refs)
        throw Error('Inconsistent AVC reorder/DPB bound');
    return reorder;
}
export function initialFrameOrder(depth = 0) {
    if (depth !== null && (!Number.isInteger(depth) || depth < 0 || depth > 16))
        throw Error('Invalid frame reorder bound');
    return { depth, frames: [], last: null };
}
export function admitOrderedFrame(state, id, pts) {
    if (state.depth !== null && (!Number.isSafeInteger(pts) || state.last !== null && pts <= state.last || state.frames.some(f => f.pts === pts)))
        return { state, error: 'Decoded presentation timestamp violates the AVC reorder bound' };
    if (state.frames.length >= 32)
        return { state, error: 'Frame queue limit' };
    const frames = [...state.frames, { id, pts }];
    if (state.depth !== null)
        frames.sort((a, b) => a.pts - b.pts);
    return { state: { ...state, frames } };
}
export function orderedFrameReady(state, flushed) { return state.frames.length > (state.depth ?? 0) || flushed && state.frames.length > 0; }
export function takeOrderedFrame(state, flushed) {
    if (!orderedFrameReady(state, flushed))
        return { state, id: null };
    const frame = state.frames[0];
    return { state: { ...state, frames: state.frames.slice(1), last: frame.pts }, id: frame.id };
}
export function orderedPacketLimit(state) { return Math.max(8, (state.depth ?? 0) + 1); }
