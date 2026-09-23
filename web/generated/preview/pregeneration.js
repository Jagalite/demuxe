// SPDX-License-Identifier: Apache-2.0
/** One lazy candidate at a time; never allocates a duration-sized work queue. */
export class PreviewPregenerator {
    run;
    timer;
    epoch = 0;
    index = 0;
    duration = null;
    enabled = true;
    finished = false;
    running = false;
    times;
    step;
    limit;
    width;
    height;
    constructor(config, bucket, run) {
        this.run = run;
        const value = (Array.isArray(config) ? { timestamps: config } : config);
        if (!value || typeof value !== 'object')
            throw new TypeError('Invalid preview pregeneration');
        this.width = value.width ?? 240;
        this.height = value.height ?? 135;
        const max = value.count ?? Infinity;
        if ((value.count != null && (!Number.isSafeInteger(max) || max < 1)) || ![this.width, this.height].every(n => Number.isInteger(n) && n > 0 && n <= 2048))
            throw new RangeError('Invalid preview pregeneration limits');
        this.limit = max;
        if ('timestamps' in value) {
            if ('every' in value || !Array.isArray(value.timestamps) || value.timestamps.length > 10000 || value.timestamps.some(n => !Number.isFinite(n) || n < 0))
                throw new RangeError('Invalid preview timestamps');
            // Deduplicate by bucket, but keep an original timestamp for the controller.
            // Quantizing the bucket boundary again can round down (e.g. 4.3 / 0.1).
            const seen = new Set();
            this.times = [...value.timestamps].sort((a, b) => a - b).filter(time => {
                const key = bucket ? Math.floor(time / bucket) : time;
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
            this.step = 0;
        }
        else {
            if (!['seconds', 'minutes'].includes(value.unit ?? 'seconds'))
                throw new RangeError('Invalid preview interval unit');
            const step = value.every * (value.unit === 'minutes' ? 60 : 1);
            if (!Number.isFinite(step) || step <= 0)
                throw new RangeError('Invalid preview interval');
            this.step = Math.max(step, bucket);
        }
    }
    setDuration(duration) { this.duration = duration !== null && Number.isFinite(duration) && duration > 0 ? duration : null; if (this.duration === null)
        this.cancelTimer();
    else
        this.schedule(); }
    setEnabled(value) { this.enabled = value; if (value)
        this.schedule();
    else
        this.cancelTimer(); }
    reset() { this.epoch++; this.index = 0; this.finished = false; this.cancelTimer(); this.schedule(); }
    stop() { this.epoch++; this.finished = true; this.cancelTimer(); }
    cancelTimer() { clearTimeout(this.timer); this.timer = undefined; }
    schedule() { if (this.timer === undefined && !this.running && this.enabled && !this.finished && this.duration !== null)
        this.timer = setTimeout(() => { this.timer = undefined; void this.tick(); }, 500); }
    async tick() {
        if (this.running || !this.enabled || this.finished || this.duration === null)
            return;
        this.running = true;
        const epoch = this.epoch;
        try {
            const time = this.times ? this.times[this.index] : this.index * this.step;
            if (this.index >= this.limit || time === undefined || time >= this.duration) {
                this.finished = true;
                return;
            }
            let outcome;
            try {
                outcome = await this.run({ time, width: this.width, height: this.height });
            }
            catch {
                outcome = 'next';
            }
            if (epoch !== this.epoch)
                return;
            if (outcome === 'stop')
                this.finished = true;
            else if (outcome === 'next')
                this.index++;
        }
        finally {
            this.running = false;
            this.schedule();
        }
    }
}
