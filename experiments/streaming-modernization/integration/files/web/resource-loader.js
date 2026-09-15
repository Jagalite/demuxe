import {IncrementalTransport, TransportError} from './incremental-transport.js';
import {LegacyManifestAdapter} from './legacy-manifest-adapter.js';
const MiB = 1024 * 1024;
const cancelled = () => new TransportError('cancelled', 'Resource operation cancelled');

// Manifests remain bounded compatibility inputs during transport qualification.
// Media bodies use progressive, forward-only delivery to native AVIO.
export class ResourceLoader {
  constructor(options, refresh) {
    this.options = options; this.transport = new IncrementalTransport(options, refresh);
    this.handles = new Map(); this.nextId = 1; this.epoch = 0; this.closed = false; this.busy = 0;
    this.identities = new Map(); this.opens = 0; this.bufferedBytes = 0; this.returnedBytes = 0; this.peakBytes = 0;
    this.scratchReservedBytes = 0; this.peakScratchReservedBytes = 0; this.peakBudgetedBytes = 0;
    this.adapter = new LegacyManifestAdapter(options, (value, base) => this.resolve(value, base),
      value => this.readAll(value));
  }
  resolve(value, base) {return this.transport.resolve(value, base);}
  get virtual() {return this.adapter.virtual;}
  storeVirtual(additions) {this.adapter.store(additions); this.budget();}
  budget() {
    const fixed = this.bufferedBytes + this.adapter.retainedBytes;
    this.transport.limits.retained = 16 * MiB - fixed - this.scratchReservedBytes;
    const owned = fixed + this.transport.stats.retainedBytes;
    const budgeted = owned + this.transport.reservedBytes + this.scratchReservedBytes;
    if (budgeted > 16 * MiB) throw new TransportError('budget', 'Aggregate resource budget exceeded');
    this.peakBytes = Math.max(this.peakBytes, owned);
    this.peakBudgetedBytes = Math.max(this.peakBudgetedBytes, budgeted);
    this.peakScratchReservedBytes = Math.max(this.peakScratchReservedBytes, this.scratchReservedBytes);
  }
  get stats() {
    return {...this.transport.stats, networkSamples:this.transport.networkSamples.collect(), opens: this.opens, handles: this.handles.size,
      consumedBytes: this.returnedBytes, transportConsumedBytes: this.transport.stats.consumedBytes,
      retainedBytes: this.bufferedBytes + this.adapter.retainedBytes + this.transport.stats.retainedBytes,
      peakRetainedBytes: Math.max(this.peakBytes, this.transport.stats.peakRetainedBytes),
      // Scratch reservations cover byte assembly and its returned copy. Parser
      // strings/browser-owned allocations are not reported as measured bytes.
      scratchReservedBytes: this.scratchReservedBytes, peakScratchReservedBytes: this.peakScratchReservedBytes,
      peakBudgetedBytes: this.peakBudgetedBytes,
      maximumManifestBytes: MiB, identityRecords: this.identities.size};
  }
  check(epoch, signal) {if (this.closed || epoch !== this.epoch || signal?.aborted) throw cancelled();}
  async readAll(url, info, first = new Uint8Array(), signal = this.activeOpenSignal) {
    const own = !info; const epoch = this.epoch;
    info ??= await this.transport.open(url, {signal});
    let position = BigInt(info.start) + BigInt(first.byteLength), total = first.byteLength;
    let reservation = 0;
    try {
      if (BigInt(info.size) > BigInt(MiB)) throw new TransportError('budget', 'Manifest or subtitle size limit exceeded');
      const capacity = BigInt(info.size) >= 0n ? Number(info.size) : MiB;
      if (first.byteLength > capacity) throw new TransportError('io', 'Resource prefix exceeds declared size');
      // One bounded assembly allocation: millions of one-byte short reads must
      // not create millions of retained TypedArray objects.
      reservation = capacity * 2 + first.byteLength;
      this.scratchReservedBytes += reservation; this.budget();
      const assembled = new Uint8Array(capacity); assembled.set(first);
      for (;;) {
        this.check(epoch, signal); this.budget();
        const bytes = await this.transport.read(info.id, position, 262144, signal);
        this.check(epoch, signal); if (!bytes.byteLength) break;
        if (bytes.byteLength > capacity - total) throw new TransportError('budget', 'Manifest or subtitle size limit exceeded');
        assembled.set(bytes, total); total += bytes.byteLength; position += BigInt(bytes.byteLength);
      }
      return assembled.slice(0, total);
    } finally {
      this.scratchReservedBytes -= reservation;
      if (own) this.transport.closeHandle(info.id);
      this.budget();
    }
  }
  materialize(url, bytes, {start, end} = {}) {
    const total = BigInt(bytes.byteLength), offset = start ?? 0n;
    if (offset < 0n || offset >= total || end !== undefined && (end <= offset || end > total))
      throw new TransportError('range', 'Invalid buffered resource range');
    if (start !== undefined) bytes = bytes.slice(Number(start), Number(end));
    const id = this.nextId++;
    this.handles.set(id, {bytes, start: offset, total, url}); this.bufferedBytes += bytes.byteLength;
    try {this.budget();} catch (error) {this.closeHandle(id); throw error;}
    return {id, url, size: String(total), start: String(offset), length: bytes.byteLength, seekable: true};
  }
  async open(value, {start, end, manifest = false, base, signal} = {}) {
    if (this.closed || signal?.aborted) throw cancelled();
    if (this.busy >= (this.options.streaming?.integrated ? 4 : 1) || this.handles.size + this.busy >= 16 || this.nextId > 0x7ffffffe ||
        !this.options.streaming?.live && this.opens >= 10000)
      throw new TransportError('budget', 'Resource handle or operation budget exceeded');
    if (start !== undefined && (typeof start !== 'bigint' || start < 0n || typeof end !== 'bigint' || end <= start) ||
        start === undefined && end !== undefined) throw new TransportError('range', 'Invalid resource range');
    let url = this.resolve(value, base), info; const epoch = this.epoch;
    this.busy++; this.opens++; if (!this.options.streaming?.integrated) this.activeOpenSignal = signal;
    try {
      if (this.adapter.virtual.has(url)) return this.materialize(url, this.adapter.virtual.get(url), {start, end});
      info = await this.transport.open(url, {start, end, ifMatch: this.identities.get(url)?.etag, signal}); this.check(epoch, signal); url = info.url;
      // Sniff without consuming an entire media segment or guessing from a signed URL.
      const sniff = []; let sniffSize = 0;
      while (sniffSize < 512) {
        const chunk = await this.transport.read(info.id, BigInt(info.start) + BigInt(sniffSize), 512 - sniffSize, signal);
        this.check(epoch, signal); if (!chunk.length) break;
        sniff.push(chunk.slice()); sniffSize += chunk.length;
      }
      const prefix = new Uint8Array(sniffSize); let sniffAt = 0;
      for (const chunk of sniff) {prefix.set(chunk, sniffAt); sniffAt += chunk.length;}
      this.check(epoch, signal);
      const text = new TextDecoder().decode(prefix).trimStart();
      manifest ||= /\.(m3u8?|mpd)$/i.test(new URL(url).pathname) || text.startsWith('#EXTM3U') || /^<\?xml\b|^<MPD\b/.test(text);
      if (manifest) {
        const bytes = await this.readAll(url, info, prefix, signal);
        this.transport.closeHandle(info.id); info = null;
        const prepared = this.options.streaming?.integrated ? {url, bytes} :
          await this.adapter.process(bytes, url, () => this.check(epoch, signal));
        this.check(epoch, signal); return this.materialize(prepared.url, prepared.bytes);
      }
      const identity = {etag: info.etag && !info.etag.startsWith('W/') ? info.etag : undefined, total: info.size};
      const previous = this.identities.get(url);
      if (previous && (previous.etag !== identity.etag || previous.total !== identity.total))
        throw new TransportError('identity', 'Resource representation changed');
      if (previous && !identity.etag && !this.options.immutable)
        throw new TransportError('identity', 'Repeated media resource requires a strong validator or immutable source');
      if (!previous && this.identities.size >= 1024)
        throw new TransportError('budget', 'Resource identity budget exceeded');
      this.identities.set(url, identity);
      const id = this.nextId++, item = {stream: info.id, prefix: prefix.slice(), prefixAt: 0,
        seekable: !!info.rangeCapable && start === undefined, total: BigInt(info.size), etag: identity.etag,
        start: BigInt(info.start), position: BigInt(info.start), url};
      this.handles.set(id, item); this.bufferedBytes += item.prefix.byteLength;
      try {this.budget();} catch (error) {this.closeHandle(id); throw error;} info = null;
      return {id, url, size: this.transport.handles.get(item.stream).total?.toString() ?? '-1',
        start: String(item.start), seekable: item.seekable};
    } finally {
      if (info) this.transport.closeHandle(info.id);
      this.busy--; if (!this.options.streaming?.integrated) this.activeOpenSignal = undefined;
    }
  }
  async read(id, offset, capacity, signal) {
    if (this.closed || signal?.aborted) throw cancelled();
    const item = this.handles.get(id), epoch = this.epoch;
    if (!item || typeof offset !== 'bigint' || offset < item.start ||
        !Number.isInteger(capacity) || capacity < 1 || capacity > 262144)
      throw new TransportError('range', 'Invalid resource read');
    let bytes;
    if (item.bytes) {
      const at = offset - item.start;
      bytes = at >= BigInt(item.bytes.length) ? new Uint8Array() : item.bytes.subarray(Number(at), Number(at) + capacity);
    } else {
      const stream = this.transport.handles.get(item.stream);
      if (offset !== item.position || stream?.error?.kind === 'timeout' || !stream && item.seekable) {
        if (!item.seekable) {
          if (stream?.error) throw stream.error;
          throw new TransportError('range', 'Resource is forward-only');
        }
        if (offset > item.total) throw new TransportError('range', 'Seek exceeds resource length');
        this.bufferedBytes -= item.prefix.byteLength; item.prefix = new Uint8Array(); item.prefixAt = 0;
        this.transport.closeHandle(item.stream);
        if (offset === item.total) {item.position = offset; return new Uint8Array();}
        const next = await this.transport.open(item.url, {start: offset, end: item.total, ifMatch: item.etag, signal});
        try {
          this.check(epoch, signal);
          if (this.handles.get(id) !== item) throw cancelled();
          if (next.size !== String(item.total)) throw new TransportError('identity', 'Resource length changed');
        } catch(error) {this.transport.closeHandle(next.id); throw error;}
        item.stream = next.id; item.position = offset;
      }
      if (item.seekable && offset === item.total) return new Uint8Array();
      if (item.prefixAt < item.prefix.length) {
        bytes = item.prefix.subarray(item.prefixAt, item.prefixAt + capacity);
        item.prefixAt += bytes.byteLength;
        if (item.prefixAt === item.prefix.length) {this.bufferedBytes -= item.prefix.length; item.prefix = new Uint8Array(); item.prefixAt = 0;}
      } else {
        bytes = await this.transport.read(item.stream, offset, capacity, signal);
        this.check(epoch, signal);
        if (this.handles.get(id) !== item) throw cancelled();
      }
      item.position += BigInt(bytes.byteLength);
    }
    this.returnedBytes += bytes.byteLength; this.budget(); return bytes;
  }
  closeHandle(id) {
    const item = this.handles.get(id); if (!item) return;
    if (item.bytes) this.bufferedBytes -= item.bytes.byteLength;
    else {this.bufferedBytes -= item.prefix.byteLength; this.transport.closeHandle(item.stream);}
    this.handles.delete(id); this.budget();
  }
  beginEpoch() {this.epoch++; this.transport.cancelPending();}
  close() {
    this.closed = true; this.epoch++; this.transport.close();
    for (const id of this.handles.keys()) this.closeHandle(id);
    this.adapter.close(); this.identities.clear();
  }
}
