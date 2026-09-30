// SPDX-License-Identifier: Apache-2.0
import { PlayerError, playerError, redact } from './internal/errors.js';
import { runtimeBase } from './internal/assets.js';
import { tracks, freeze } from './internal/state.js';
export const CUSTOM_SOURCE_PLAYBACK_LIMIT = 32 * 1024 * 1024;
export function isCustomSource(value) { return !!value && typeof value === 'object' && value.kind === 'bytes'; }
function validate(source) { if (source.transport !== 'application-managed' || typeof source.id !== 'string' || !source.id || source.id.length > 256 || !Number.isSafeInteger(source.size) || source.size <= 0 || typeof source.read !== 'function' || source.close !== undefined && typeof source.close !== 'function' || source.ownership !== undefined && !['owned', 'borrowed'].includes(source.ownership))
    throw new PlayerError('INVALID_ARGUMENT', 'Invalid immutable random-access source'); }
function deadline(work, signal, ms) {
    return new Promise((resolve, reject) => {
        const abort = () => finish(new PlayerError('ABORTED', 'Source read cancelled'));
        const timer = setTimeout(() => finish(new PlayerError('NETWORK_TIMEOUT', 'Source read deadline exceeded')), ms);
        let done = false;
        const finish = (error, value) => { if (done)
            return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort); error ? reject(error) : resolve(value); };
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted)
            abort();
        work.then(value => finish(undefined, value), error => finish(error));
    });
}
/** Serialize provider calls, reject late results, and never retain provider buffers. */
class ByteReader {
    source;
    maxReads;
    maxBytes;
    failure;
    reads = 0;
    bytes = 0;
    queue = Promise.resolve();
    controller = new AbortController();
    removeAbort;
    original;
    constructor(source, signal, maxReads, maxBytes) {
        this.source = source;
        this.maxReads = maxReads;
        this.maxBytes = maxBytes;
        validate(source);
        this.original = source;
        this.source = { ...source, read: source.read.bind(source), close: source.close?.bind(source) };
        const abort = () => this.controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted)
            abort();
        this.removeAbort = () => signal?.removeEventListener('abort', abort);
    }
    fail(error) { this.failure ??= playerError(error); this.controller.abort(); throw this.failure; }
    read(offset, length) {
        if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > this.source.size || length > 1024 * 1024)
            return Promise.reject(new PlayerError('INVALID_ARGUMENT', 'Invalid byte range'));
        const work = this.queue.then(async () => {
            const signal = this.controller.signal;
            if (signal.aborted)
                throw new PlayerError('ABORTED', 'Source closed');
            if (this.original.id !== this.source.id || this.original.size !== this.source.size)
                this.fail(new PlayerError('SOURCE_CHANGED', 'Source identity or size changed'));
            if (this.bytes + length > this.maxBytes)
                throw new PlayerError('INVALID_ARGUMENT', 'Inspection byte budget exceeded');
            const result = new Uint8Array(length);
            let at = 0;
            while (at < length) {
                if (this.reads >= this.maxReads)
                    throw new PlayerError('INVALID_ARGUMENT', 'Source read budget exceeded');
                const size = Math.min(length - at, 262144);
                this.reads++;
                let bytes;
                try {
                    bytes = await deadline(Promise.resolve().then(() => this.source.read(offset + at, size, signal)), signal, 3000);
                }
                catch (error) {
                    this.fail(error);
                }
                if (signal.aborted)
                    throw new PlayerError('ABORTED', 'Source closed');
                if (this.original.id !== this.source.id || this.original.size !== this.source.size)
                    this.fail(new PlayerError('SOURCE_CHANGED', 'Source identity or size changed'));
                if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > size)
                    this.fail(new PlayerError('SOURCE_CHANGED', 'Invalid short read or premature EOF'));
                result.set(bytes, at);
                at += bytes.length;
                this.bytes += bytes.length;
            }
            return result.buffer;
        });
        this.queue = work.then(() => { }, () => { });
        return work;
    }
    async close() { this.controller.abort(); this.removeAbort(); if (this.source.ownership === 'owned' && this.source.close)
        await deadline(Promise.resolve().then(() => this.source.close()), new AbortController().signal, 3000); }
}
export async function materializeSource(source, signal) {
    validate(source);
    if (source.size > CUSTOM_SOURCE_PLAYBACK_LIMIT)
        throw new PlayerError('UNSUPPORTED_FEATURE', 'Custom playback staging is limited to 32 MiB; use a File for larger sources');
    const reader = new ByteReader(source, signal, 4096, CUSTOM_SOURCE_PLAYBACK_LIMIT);
    try {
        const parts = [];
        for (let at = 0; at < source.size; at += 262144)
            parts.push(await reader.read(at, Math.min(262144, source.size - at)));
        return new File(parts, source.name ?? 'custom-media', { type: source.type ?? '' });
    }
    finally {
        await reader.close();
    }
}
let serial = 0;
/** Metadata only: no player, decode session, canvas, or audio output is created. */
export async function inspectMedia(input, options = {}) {
    const maxBytes = options.maxBytes ?? 512 * 1024, maxReads = options.maxReads ?? 32, timeoutMs = options.timeoutMs ?? 10000;
    if (!Number.isInteger(maxBytes) || maxBytes < 64 || maxBytes > 512 * 1024 || !Number.isInteger(maxReads) || maxReads < 1 || maxReads > 128 || !Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000)
        throw new PlayerError('INVALID_ARGUMENT', 'Invalid inspection budget');
    const base = runtimeBase(options.assetBase), controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted)
        abort();
    const timer = setTimeout(abort, timeoutMs);
    let reader, remote;
    try {
        if (controller.signal.aborted)
            throw new PlayerError('ABORTED', 'Inspection cancelled');
        let source;
        if (isCustomSource(input))
            source = input;
        else if (input instanceof Blob || input instanceof ArrayBuffer) {
            const blob = input instanceof Blob ? input : new Blob([input]);
            source = { kind: 'bytes', transport: 'application-managed', id: 'local', size: blob.size, read: async (at, n) => new Uint8Array(await blob.slice(at, at + n).arrayBuffer()) };
        }
        else {
            const value = typeof input === 'string' || input instanceof URL ? { url: String(input) } : input;
            if (value.format && value.format !== 'file' || value.streaming)
                throw new PlayerError('UNSUPPORTED_FEATURE', 'Inspection accepts file sources, not adaptive manifests');
            const { RangeReader } = await import(new URL('web/range-reader.js', base).href);
            if (controller.signal.aborted)
                throw new PlayerError('ABORTED', 'Inspection cancelled');
            remote = new RangeReader({ ...value, url: new URL(value.url, location.href).href, blockBytes: 65536, cacheBytes: 262144 }, value.refreshAuthorization);
            controller.signal.addEventListener('abort', () => remote.close(), { once: true });
            const opened = await deadline(remote.open(), controller.signal, timeoutMs), size = Number(opened.size);
            source = { kind: 'bytes', transport: 'application-managed', id: 'remote', size, read: (at, n) => remote.read(BigInt(at), n) };
        }
        reader = new ByteReader(source, controller.signal, maxReads, maxBytes);
        const file = { size: source.size, slice: (at, end) => ({ arrayBuffer: () => reader.read(at, end - at) }) };
        const { inspectFastSource } = await import(new URL('web/fast-source-inspector.js', base).href);
        const result = await deadline(inspectFastSource(file, { signal: controller.signal, requirements: ['container', 'tracks', 'duration'] }), controller.signal, timeoutMs);
        // The fast parser intentionally turns unsupported/missing metadata into
        // incomplete evidence. Transport failures must retain their error contract.
        if (reader.failure)
            throw reader.failure;
        const evidence = result.evidence, run = ++serial;
        const list = evidence?.tracks ? tracks(evidence.tracks.map((t) => ({ ...t, 'ff-index': t.index, selected: false })), run, 'software').map(t => ({ ...t, id: `inspection:${t.id}` })) : [];
        return freeze({ id: `inspection:${run}`, sourceIdentity: isCustomSource(input) ? input.id : null, status: result.status === 'satisfied' ? 'complete' : evidence ? 'partial' : 'unknown', completeFor: result.available ?? [], format: evidence?.format ?? null, duration: Number.isFinite(evidence?.duration) && evidence.duration > 0 ? evidence.duration : null, tracks: evidence?.tracks ? list : null, chapters: null, tags: null, reason: result.reason ? String(redact(result.reason)) : null, bytesRead: reader.bytes, reads: reader.reads });
    }
    finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
        remote?.close();
        await reader?.close();
    }
}
