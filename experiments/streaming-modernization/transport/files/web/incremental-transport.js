// Browser byte transport only. No manifest, segment-selection or playback clock.
export class TransportError extends Error {
  constructor(kind, message) { super(message); this.name = 'TransportError'; this.kind = kind; }
}
const fault = (kind, message) => new TransportError(kind, message);
const MiB = 1024 * 1024;

export class IncrementalTransport {
  constructor(options, refresh, limits = {}) {
    this.options = {credentials: 'omit', ...options};
    this.refresh = refresh;
    this.rootOrigin = new URL(options.url).origin;
    this.allowed = new Set(options.allowedOrigins ?? [this.rootOrigin]);
    this.headers = new Map([[this.rootOrigin, new Headers(options.headers)]]);
    this.limits = {handles: 16, opens: 4, retained: 16 * MiB, chunk: 2 * MiB,
      absoluteMs: 60000, stallMs: 5000, ...limits};
    this.handles = new Map(); this.nextId = 1; this.generation = 0; this.closed = false;
    this.opening = 0;
    this.stats = {requests: 0, retries: 0, fetchedBytes: 0, consumedBytes: 0,
      discardedBytes: 0, retainedBytes: 0, peakRetainedBytes: 0, handles: 0,
      peakHandles: 0, cancellations: 0, failures: 0, pullWaitMs: 0, applicationIdleMs: 0};
    this.resolve(options.url);
  }

  resolve(value, base = this.options.url) {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        url.href.length > 4095 || !this.allowed.has(url.origin))
      throw fault('policy', 'Resource URL is not allowed');
    url.hash = ''; return url.href;
  }

  check(item) {
    if (this.closed || !this.handles.has(item.id) || item.controller.signal.aborted)
      throw item.error ?? fault('cancelled', 'Resource request cancelled');
  }

  async wait(promise, item) {
    this.check(item);
    let timeout, aborted;
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        aborted = () => reject(item.error ?? fault('cancelled', 'Resource request cancelled'));
        item.controller.signal.addEventListener('abort', aborted, {once: true});
        timeout = setTimeout(() => this.fail(item, fault('timeout', 'Resource request stalled')), this.limits.stallMs);
      })]);
    } finally {
      clearTimeout(timeout);
      item.controller.signal.removeEventListener('abort', aborted);
    }
  }

  dropChunk(item) {
    if (!item.chunk) return;
    this.stats.retainedBytes -= item.chunk.byteLength;
    item.chunk = null; item.at = 0;
  }

  fail(item, error) {
    if (!item.error) {
      item.error = error;
      this.stats[error.kind === 'cancelled' ? 'cancellations' : 'failures']++;
    }
    clearTimeout(item.deadline);
    item.controller.abort();
    // Never await cancellation while a native thread waits for this operation.
    void item.reader?.cancel().catch(() => {});
    if (item.chunk) this.stats.discardedBytes += item.chunk.byteLength - item.at;
    this.dropChunk(item);
  }

  async open(value, {start, end, base, ifMatch} = {}) {
    if (this.closed) throw fault('cancelled', 'Resource transport closed');
    if (this.handles.size >= this.limits.handles || this.opening >= this.limits.opens)
      throw fault('budget', 'Resource concurrency budget exceeded');
    if (this.nextId > 0x7ffffffe) throw fault('budget', 'Resource identity space exhausted');
    if (start !== undefined && (typeof start !== 'bigint' || start < 0n ||
        typeof end !== 'bigint' || end <= start) || start === undefined && end !== undefined)
      throw fault('range', 'Invalid resource range');
    const item = {id: this.nextId++, url: this.resolve(value, base), start: start ?? 0n,
      position: start ?? 0n, expected: undefined, total: undefined, received: 0n,
      controller: new AbortController(), reader: null, chunk: null, at: 0,
      reading: false, eof: false, lastRead: null};
    this.handles.set(item.id, item); this.opening++;
    this.stats.handles = this.handles.size;
    this.stats.peakHandles = Math.max(this.stats.peakHandles, this.stats.handles);
    item.deadline = setTimeout(() => this.fail(item, fault('timeout', 'Resource deadline exceeded')), this.limits.absoluteMs);
    let response, refreshed = false;
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        this.check(item);
        const origin = new URL(item.url).origin;
        const headers = new Headers(this.headers.get(origin));
        headers.delete('Range'); headers.delete('If-Range'); headers.delete('If-Match');
        if (ifMatch) headers.set('If-Match', ifMatch);
        if (start !== undefined) headers.set('Range', `bytes=${start}-${end - 1n}`);
        this.stats.requests++;
        try {
          const fetching = fetch(item.url, {headers, credentials: this.options.credentials,
            redirect: 'error', cache: 'no-store', signal: item.controller.signal}).then(response => {
              try { this.check(item); }
              catch (error) { void response.body?.cancel().catch(() => {}); throw error; }
              return response;
            });
          response = await this.wait(fetching, item);
          this.check(item);
          if (response.status === 401 && this.refresh && !refreshed) {
            void response.body?.cancel().catch(() => {}); refreshed = true;
            const update = await this.wait(Promise.resolve().then(() => this.refresh({url: item.url})), item);
            this.check(item);
            const next = update?.url ? this.resolve(update.url) : item.url;
            // Refresh cannot redirect the original origin's credentials elsewhere.
            if (new URL(next).origin !== origin) throw fault('policy', 'Authorization refresh changed resource origin');
            if (update?.headers) {
              const updated = new Headers(this.headers.get(origin));
              new Headers(update.headers).forEach((value, name) => updated.set(name, value));
              this.headers.set(origin, updated);
            }
            item.url = next; continue;
          }
          if ([408, 429, 500, 502, 503, 504].includes(response.status)) {
            void response.body?.cancel().catch(() => {});
            throw fault('retryable', `Resource HTTP ${response.status}`);
          }
          if (response.status !== (start === undefined ? 200 : 206))
            throw fault(response.status === 410 ? 'expired' : 'http', `Resource HTTP ${response.status}`);
          const encoding = response.headers.get('Content-Encoding');
          if (encoding && encoding !== 'identity') throw fault('range', 'Encoded resource body is unsupported');
          if (start !== undefined) {
            const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range') ?? '');
            if (!range || BigInt(range[1]) !== start || BigInt(range[2]) + 1n !== end || BigInt(range[3]) < end)
              throw fault('range', 'Invalid resource Content-Range');
            item.total = BigInt(range[3]); item.expected = end - start;
          }
          const length = response.headers.get('Content-Length');
          if (length !== null) {
            if (!/^\d+$/.test(length)) throw fault('range', 'Invalid resource length');
            const size = BigInt(length);
            if (item.expected !== undefined && item.expected !== size) throw fault('range', 'Resource length mismatch');
            item.expected = size;
            item.total ??= size;
          }
          if (!response.body) throw fault('io', 'Missing resource body');
          item.etag = response.headers.get('ETag');
          if (ifMatch && item.etag !== ifMatch) throw fault('identity', 'Resource representation changed');
          item.rangeCapable = response.headers.get('Accept-Ranges') === 'bytes' &&
            item.total !== undefined && !!item.etag && !item.etag.startsWith('W/');
          if (item.total !== undefined && item.total > 0x7fffffffffffffffn)
            throw fault('range', 'Resource length exceeds the native offset domain');
          item.reader = response.body.getReader();
          return {id: item.id, url: item.url, size: item.total === undefined ? '-1' : String(item.total),
            start: String(item.start), seekable: false, etag: item.etag, rangeCapable: item.rangeCapable};
        } catch (error) {
          void response?.body?.cancel().catch(() => {});
          this.check(item);
          if (attempt === 3 || !(error.kind === 'retryable' || error instanceof TypeError)) throw error;
          this.stats.retries++;
          let timer;
          try { await this.wait(new Promise(resolve => {timer = setTimeout(resolve, 100 * (attempt + 1));}), item); }
          finally { clearTimeout(timer); }
        }
      }
      throw fault('http', 'Resource attempts exhausted');
    } catch (error) {
      this.fail(item, error instanceof TransportError ? error : fault('io', 'Resource open failed'));
      this.closeHandle(item.id); throw item.error;
    } finally { this.opening--; }
  }

  async read(id, offset, capacity) {
    const item = this.handles.get(id);
    if (!item) throw fault('cancelled', 'Resource handle is closed');
    this.check(item);
    if (typeof offset !== 'bigint' || offset !== item.position)
      throw fault('range', 'Resource is forward-only');
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 262144 || item.reading)
      throw fault('range', 'Invalid or concurrent resource read');
    if (item.eof) return new Uint8Array();
    item.reading = true;
    const began = performance.now();
    if (item.lastRead !== null) this.stats.applicationIdleMs += began - item.lastRead;
    try {
      if (!item.chunk) {
        // No background producer: native demand pulls Fetch, enforcing backpressure.
        if (this.stats.retainedBytes + this.limits.chunk > this.limits.retained)
          throw fault('budget', 'Aggregate resource buffer budget exceeded');
        const pull = performance.now();
        let done, value;
        for (;;) {
          ({done, value} = await this.wait(item.reader.read(), item));
          this.check(item);
          if (done || value?.byteLength) break;
          if (!(value instanceof Uint8Array)) throw fault('io', 'Invalid resource byte chunk');
          if (performance.now() - pull >= this.limits.stallMs)
            throw fault('timeout', 'Resource request stalled');
          // Empty stream chunks are starvation, not EOF; let cancellation run.
          await new Promise(resolve => setTimeout(resolve, 0));
        }
        this.stats.pullWaitMs += performance.now() - pull;
        this.check(item);
        if (done) {
          if (item.expected !== undefined && item.received !== item.expected)
            throw fault('truncated', 'Resource ended before its declared length');
          item.eof = true; clearTimeout(item.deadline);
          item.total ??= item.start + item.received;
          return new Uint8Array();
        }
        if (!(value instanceof Uint8Array))
          throw fault('io', 'Invalid resource byte chunk');
        this.stats.fetchedBytes += value.byteLength;
        item.received += BigInt(value.byteLength);
        if (item.expected !== undefined && item.received > item.expected) {
          this.stats.discardedBytes += value.byteLength;
          throw fault('truncated', 'Resource exceeds its declared length');
        }
        if (value.byteLength > this.limits.chunk || value.buffer.byteLength > this.limits.chunk) {
          this.stats.discardedBytes += value.byteLength;
          throw fault('budget', 'Browser delivery chunk exceeds transport budget');
        }
        // Normalize ownership; a small view must not retain an oversized backing buffer.
        item.chunk = value.byteOffset || value.byteLength !== value.buffer.byteLength ? value.slice() : value;
        item.at = 0;
        this.stats.retainedBytes += item.chunk.byteLength;
        this.stats.peakRetainedBytes = Math.max(this.stats.peakRetainedBytes, this.stats.retainedBytes);
      }
      const size = Math.min(capacity, item.chunk.byteLength - item.at);
      const bytes = item.chunk.subarray(item.at, item.at + size);
      item.at += size; item.position += BigInt(size); this.stats.consumedBytes += size;
      if (item.at === item.chunk.byteLength) this.dropChunk(item);
      return bytes;
    } catch (error) {
      this.fail(item, error instanceof TransportError ? error : fault('io', 'Resource read failed'));
      throw item.error;
    } finally { item.reading = false; item.lastRead = performance.now(); }
  }

  cancelPending() {
    this.generation++;
    for (const item of this.handles.values()) if (item.reading || !item.reader) {
      this.fail(item, fault('cancelled', 'Resource read cancelled'));
      this.closeHandle(item.id);
    }
  }

  closeHandle(id) {
    const item = this.handles.get(id); if (!item) return;
    clearTimeout(item.deadline);
    if (!item.eof && !item.error) this.fail(item, fault('cancelled', 'Resource closed'));
    else { item.controller.abort(); void item.reader?.cancel().catch(() => {}); this.dropChunk(item); }
    this.handles.delete(id); this.stats.handles = this.handles.size;
  }

  close() {
    this.closed = true; this.generation++;
    for (const id of this.handles.keys()) this.closeHandle(id);
  }
}
