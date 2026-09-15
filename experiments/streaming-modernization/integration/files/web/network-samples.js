// Bounded network measurement. URLs stay private and never enter diagnostics.
export class NetworkSamples {
  constructor(clock = performance, Observer = globalThis.PerformanceObserver) {
    this.clock = clock; this.timings = []; this.pending = []; this.samples = [];
    this.serial = 0; this.closed = false; this.dropped = 0;
    if (Observer) {
      try {
        this.observer = new Observer(list => {
          this.observe(list.getEntries());
          // This observer lives in the source's dedicated I/O worker.
          this.clock.clearResourceTimings?.();
        });
        this.observer.observe({type: 'resource', buffered: true});
      } catch {this.observer?.disconnect(); this.observer = null;}
    }
  }

  observe(entries) {
    if (this.closed) return;
    for (const entry of entries) if (entry.initiatorType === 'fetch') {
      this.timings.push({name: entry.name, startTime: entry.startTime, responseEnd: entry.responseEnd,
        transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize});
      if (this.timings.length > 64) this.timings.shift();
    }
  }

  complete(item) {
    if (this.closed || !item.eof || item.error) return;
    if (item.received < 32768n || item.received > BigInt(Number.MAX_SAFE_INTEGER)) return;
    this.pending.push({url: item.url, bytes: Number(item.received), start: item.fetchStart,
      end: this.clock.now(), idle: item.idleMs, maxIdle: item.maxIdleMs, idleIntervals: item.idleIntervals?.map(i => [...i]),
      idleOverflow: item.idleOverflow, retries: item.attempt});
    if (this.pending.length > 32) {this.pending.shift(); this.dropped++;}
  }

  collect() {
    if (this.closed) return this.samples;
    const now = this.clock.now(), pending = [];
    for (const item of this.pending) {
      const candidates = this.timings.map((entry, index) => ({entry, index}))
        .filter(({entry: e}) => e.name === item.url && e.startTime >= item.start-1 &&
          e.startTime <= item.start+20 && e.responseEnd <= item.end+20)
        .sort((a, b) => Math.abs(a.entry.startTime-item.start)-Math.abs(b.entry.startTime-item.start));
      if (!candidates.length && now-item.end < 500) {pending.push(item); continue;}
      const candidate = candidates[0], e = candidate?.entry;
      if (candidate) this.timings.splice(candidate.index, 1);
      let reason = null, networkMs = e ? e.responseEnd-e.startTime : null;
      let idle = item.idle, maxIdle = item.maxIdle;
      if (e && item.idleIntervals) {
        // If the browser completed the response before the consumer resumed,
        // that wait did not gate network completion. Do not count post-download
        // consumption time as network backpressure. Earlier waits remain a
        // conservative exclusion; never subtract them from Resource Timing.
        const intervals = item.idleIntervals.filter(([start, end]) => start < e.responseEnd && end < e.responseEnd)
          .map(([start, end]) => Math.max(0, end-Math.max(start, e.startTime)));
        idle = intervals.reduce((sum, value) => sum+value, 0);
        maxIdle = Math.max(0, ...intervals);
      }
      if (!e) reason = 'timing-unavailable';
      else if (!(e.transferSize > 0) || !(e.encodedBodySize > 0)) reason = 'cache-or-unavailable-timing';
      else if (e.encodedBodySize !== item.bytes) reason = 'timing-body-mismatch';
      else if (!Number.isFinite(networkMs) || networkMs < 50) reason = 'sample-too-short';
      else if (item.retries) reason = 'retried-resource';
      else if (item.idleOverflow || maxIdle > 50 || idle > Math.max(25, networkMs*0.1)) reason = 'application-backpressure';
      this.samples.push({serial: ++this.serial, bytes: item.bytes, networkMs,
        completedAt: this.clock.timeOrigin+(e?.responseEnd ?? item.end), eligible: reason === null, reason});
      if (this.samples.length > 16) this.samples.shift();
    }
    this.pending = pending;
    return this.samples.map(s => ({...s}));
  }

  close() {
    this.closed = true; this.observer?.disconnect(); this.timings.length = 0;
    this.pending.length = 0;
  }
}
