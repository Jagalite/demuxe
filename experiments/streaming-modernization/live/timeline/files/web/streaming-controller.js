import {StreamingPolicy} from './streaming-policy.js';

// One source-bound intent controller. It neither parses manifests nor schedules
// packets/frames. The native coordinator accepts transitions on its demux thread.
export class StreamingController {
  constructor(native) {this.native = native; this.reset(0);}

  reset(source, options = {mode: 'manual'}) {
    // Validate before making any native request. The policy constructor is also
    // used here before native representation discovery has completed.
    new StreamingPolicy([], options);
    this.source = source; this.options = {...options}; this.policy = null;
    this.buffer = null; this.starving = false; this.cacheUnderrun = false; this.rate = 1; this.latestNetworkAt = null;
    this.lastError = null;
    this.dropCounters = new Map(); this.pendingDrops = 0; this.dropSamples = [];
    this.decoderErrors = null; this.unhealthyUntil = -Infinity; this.seekHealthReset = true;
  }

  checkFailure() {
    const error=this.source?this.native.error?.(this.source):0;
    if(Number.isInteger(error)&&error<0)throw Error(`${this.native.errorMessage?.(this.source)||'Integrated streaming demux failed'} (${error})`);
  }

  event(event) {
    if (event.event === 'seek' || event.event === 'start-file') {this.seekHealthReset = true; return;}
    if (event.event === 'property-change' && ['decoder-frame-drop-count','frame-drop-count'].includes(event.name) && Number.isSafeInteger(event.data) && event.data >= 0) {
      const previous=this.dropCounters.get(event.name);this.dropCounters.set(event.name,event.data);
      if (previous !== undefined && event.data > previous) this.pendingDrops += event.data-previous;
    }
    if (event.event !== 'property-change') return;
    if (event.name === 'demuxer-cache-state') {
      const value = event.data?.['cache-duration'];
      this.buffer = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
      this.cacheUnderrun = event.data?.underrun === true;
    }
    if (event.name === 'paused-for-cache') this.starving = event.data === true;
    if (event.name === 'speed' && Number.isFinite(event.data) && event.data > 0) this.rate = event.data;
  }

  bind(status) {
    if (!this.source || status.source !== this.source || !status.available) return false;
    if (!this.policy) this.policy = new StreamingPolicy(status.qualities, this.options);
    return true;
  }

  configure(source, options, representation = null) {
    const status = this.native.status();
    if (source !== this.source || !this.bind(status)) throw Error('Quality selection is unavailable for this source');
    const checked = new StreamingPolicy(status.qualities, options);
    if (!checked.eligible().length) throw Error('No representation meets the quality policy');
    if (options.mode === 'manual' && !checked.eligible().some(r => r.index === representation))
      throw Error('Requested quality is unavailable');
    if (options.mode === 'manual') {const result=this.request(status, representation);if(result<0)return result;}
    this.options = {...options}; this.policy.configure(options);
    return 0;
  }

  request(status, representation) {
    if (status.source !== this.source || status.request >= 0x7ffffffe) return -1;
    const result = this.native.request(this.source, status.request+1, representation);
    this.lastError = result < 0 ? 'Native quality request rejected' : null;
    return result;
  }

  manual(source, request, representation) {
    const status = this.native.status();
    if (source !== this.source || !this.bind(status)) return -1;
    if (!this.policy.eligible().some(r => r.index === representation)) return -1;
    const result = this.native.request(source, request, representation);
    if (result >= 0) {this.options.mode = 'manual'; this.policy.configure(this.options);}
    return result;
  }

  tick({io, paused, decoderHealthy = true, decoderStatus, now = performance.timeOrigin+performance.now()}) {
    const status = this.native.status();
    if (!this.bind(status)) return {policy: {...this.options}, available: false};
    for (const sample of io?.networkSamples ?? []) {
      this.policy.sample(sample);
      if (sample.eligible && Number.isFinite(sample.completedAt))
        this.latestNetworkAt = Math.max(this.latestNetworkAt ?? -Infinity, sample.completedAt);
    }
    if (paused || this.seekHealthReset) {
      this.pendingDrops=0;this.dropSamples=[];this.unhealthyUntil=-Infinity;
      this.healthGraceUntil=now+1000;this.seekHealthReset=false;
    }
    if (Number.isSafeInteger(decoderStatus?.errors)) {
      if (this.decoderErrors!==null && decoderStatus.errors>this.decoderErrors) this.unhealthyUntil=now+5000;
      this.decoderErrors=decoderStatus.errors;
    }
    if (this.pendingDrops && now>=(this.healthGraceUntil??0)) this.dropSamples.push({at:now,count:this.pendingDrops});
    this.pendingDrops=0;this.dropSamples=this.dropSamples.filter(s=>now-s.at<=2000).slice(-32);
    const dropped=this.dropSamples.reduce((sum,s)=>sum+s.count,0);
    decoderHealthy=decoderHealthy && now>=this.unhealthyUntil && dropped<3;
    const recent = this.latestNetworkAt !== null && now-this.latestNetworkAt <= 15000;
    const decision = this.policy.decide({now, active: status.demuxed,
      requested: status.requested < 0 ? status.demuxed : status.requested,
      preparing: status.preparing, bufferSeconds: recent ? this.buffer : null,
      starving: this.starving || this.cacheUnderrun, decoderHealthy, paused,
      playbackRate: this.rate});
    if (decision) decision.nativeResult = this.request(status, decision.target);
    return {...this.policy.diagnostics(), available: true, networkSampleRecent: recent,
      forwardBufferSeconds: this.buffer, starving: this.starving, cacheUnderrun: this.cacheUnderrun, decoderHealthy, bufferScope: 'mpv forward packet cache; excludes decoded/audio queues',
      lastError: this.lastError};
  }
}

// Firefox stacks omit the message and can contain unrelated timer names. Only
// the actual message belongs in public error classification; never the stack.
export function workerErrorMessage(error) { return String(error?.message ?? error); }
