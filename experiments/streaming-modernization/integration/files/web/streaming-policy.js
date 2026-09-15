// Quality policy only. FFmpeg owns the timeline; mpv owns the playback clock.
// Network samples must exclude cache hits, application backpressure and failures.
export class StreamingPolicy {
  constructor(representations, options = {}) {
    this.representations = representations.map(r => ({...r}));
    this.fast = null; this.slow = null; this.lastBps = null; this.samples = 0; this.lastSample = 0;
    this.lastSwitch = -Infinity; this.upCandidate = null; this.upSince = 0;
    this.decisions = []; this.rejectedSamples = {}; this.configure(options);
  }

  configure({mode = 'manual', maxBandwidth = Infinity, maxWidth = Infinity, maxHeight = Infinity} = {}) {
    if (!['manual', 'auto'].includes(mode)) throw new TypeError('Invalid quality policy');
    for (const value of [maxBandwidth, maxWidth, maxHeight])
      if (!(value > 0) || !Number.isFinite(value) && value !== Infinity)
        throw new TypeError('Invalid quality ceiling');
    this.options = {mode, maxBandwidth, maxWidth, maxHeight};
    this.upCandidate = null;
  }

  eligible() {
    const o = this.options;
    return this.representations.filter(r => r.eligible !== false && r.bitrate > 0 &&
      r.bitrate <= o.maxBandwidth && r.width <= o.maxWidth && r.height <= o.maxHeight)
      .sort((a, b) => a.bitrate - b.bitrate);
  }

  sample(value) {
    if (!Number.isSafeInteger(value.serial) || value.serial <= this.lastSample) return;
    this.lastSample = value.serial;
    if (!value.eligible || !Number.isFinite(value.bytes) || value.bytes < 32768 ||
        !Number.isFinite(value.networkMs) || value.networkMs < 50) {
      const reason = value.reason || 'insufficient-network-sample';
      this.rejectedSamples[reason] = (this.rejectedSamples[reason] || 0) + 1;
      return;
    }
    const bps = value.bytes * 8000 / value.networkMs;
    if (!Number.isFinite(bps) || bps <= 0) return;
    this.lastBps = bps;
    // Duration-weighted fast and slow EWMAs. The lower estimate responds to
    // deterioration sooner than improvement; no cache or idle time is subtracted
    // to manufacture an artificially high network rate.
    const weight = halfLife => 1 - Math.pow(0.5, value.networkMs / halfLife);
    this.fast = this.fast === null ? bps : this.fast + weight(2000) * (bps - this.fast);
    this.slow = this.slow === null ? bps : this.slow + weight(8000) * (bps - this.slow);
    this.samples++;
  }

  decide({now, active, requested = active, preparing = -1, bufferSeconds = null,
          starving = false, decoderHealthy = true, paused = false, playbackRate = 1}) {
    if (this.options.mode !== 'auto' || paused || !Number.isFinite(now) ||
        !Number.isFinite(playbackRate) || playbackRate <= 0) return null;
    const eligible = this.eligible();
    if (!eligible.length) return null;
    const current = this.representations.find(r => r.index === active);
    if (!current) return null;
    const estimate = this.fast === null ? null : Math.min(this.fast, this.slow, this.lastBps);
    const budget = estimate === null ? null : estimate * 0.75 / playbackRate;
    const forward = Number.isFinite(bufferSeconds) && bufferSeconds >= 0 ? bufferSeconds / playbackRate : null;
    let target = eligible[0], reason = 'conservative-start';
    if (budget !== null) {
      for (const r of eligible) if (r.bitrate <= budget) target = r;
      reason = 'throughput-margin';
    }
    const unhealthy = starving || !decoderHealthy;
    if (unhealthy) {target = eligible[0]; reason = starving ? 'playback-starvation' : 'decoder-health';}
    const admitted = eligible.some(r => r.index === current.index);
    if (!admitted) reason = 'application-ceiling';
    const down = target.bitrate < current.bitrate || !admitted;
    const pending = preparing >= 0 || requested !== active;
    // Retire an obsolete upswitch promptly when it no longer fits the estimate.
    const requestedRepresentation = this.representations.find(r => r.index === requested);
    const cancelPending = pending && requestedRepresentation && target.bitrate < requestedRepresentation.bitrate;
    if (target.index === active && !cancelPending) {this.upCandidate = null; return null;}
    if (!down && !cancelPending) {
      // Unknown forward buffer is not permission to upswitch. Seekable duration
      // and cached bytes are deliberately absent from this decision interface.
      if (pending || this.samples < 2 || forward === null || forward < 4 ||
          budget === null || budget < target.bitrate * 1.15 || unhealthy) {
        this.upCandidate = null; return null;
      }
      if (this.upCandidate !== target.index) {this.upCandidate = target.index; this.upSince = now; return null;}
      if (now - this.upSince < 6000 || now - this.lastSwitch < 8000) return null;
      reason = 'sustained-throughput-and-buffer';
    }
    if (target.index === requested && pending) return null;
    this.lastSwitch = now; this.upCandidate = null;
    const decision = {target: target.index, reason, now, estimatedBitsPerSecond: estimate,
      bandwidthBudget: budget, forwardSeconds: forward, active, requested};
    this.decisions.push(decision);
    if (this.decisions.length > 32) this.decisions.shift();
    return decision;
  }

  diagnostics() {
    return {policy: {...this.options}, fastBitsPerSecond: this.fast, slowBitsPerSecond: this.slow, lastBitsPerSecond: this.lastBps,
      acceptedSamples: this.samples, upCandidate: this.upCandidate, upSince: this.upCandidate===null?null:this.upSince, lastSwitch: Number.isFinite(this.lastSwitch)?this.lastSwitch:null, rejectedSamples: {...this.rejectedSamples},
      decisions: this.decisions.map(d => ({...d}))};
  }
}
