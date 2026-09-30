// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
export function watchdogPolicy(options = true) {
    if (typeof options !== 'boolean' && (!options || typeof options !== 'object' || Array.isArray(options)))
        throw new PlayerError('INVALID_ARGUMENT', 'Invalid watchdog policy');
    const values = typeof options === 'boolean' ? {} : options;
    const keys = ['nativeProgress', 'hybridDecoder', 'decoderOutput', 'selectiveAudio'];
    for (const key of Object.keys(values))
        if (![...keys, 'nativeProgressTimeoutMs'].includes(key))
            throw new PlayerError('INVALID_ARGUMENT', 'Unknown watchdog option: ' + key);
    const policy = { nativeProgress: options !== false, hybridDecoder: options !== false, decoderOutput: options !== false, selectiveAudio: options !== false, nativeProgressTimeoutMs: 10000 };
    for (const key of keys)
        if (values[key] !== undefined) {
            if (typeof values[key] !== 'boolean')
                throw new PlayerError('INVALID_ARGUMENT', 'Invalid watchdog option: ' + key);
            policy[key] = values[key];
        }
    if (values.nativeProgressTimeoutMs !== undefined) {
        const value = values.nativeProgressTimeoutMs;
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 1000 || value > 120000)
            throw new PlayerError('INVALID_ARGUMENT', 'Native progress timeout must be between 1000 and 120000 ms');
        policy.nativeProgressTimeoutMs = value;
    }
    return Object.freeze(policy);
}
/** Sampled observations, not per-frame callbacks. Ineligible periods never spend
 * a failure budget; timer suspension and media discontinuities start fresh. */
export class NativeProgressWatchdog {
    previous;
    lastSample;
    clockSince = 0;
    frameSince = 0;
    reset() { this.previous = undefined; this.lastSample = undefined; }
    sample(now, value, timeoutMs) {
        const old = this.previous, last = this.lastSample;
        if (!value.eligible || !Number.isFinite(value.time)) {
            this.reset();
            return;
        }
        this.previous = { ...value };
        this.lastSample = now;
        if (!old || last === undefined || now < last || now - last > 2000 || value.rate !== old.rate || value.time < old.time || value.time - old.time > Math.max(2, (now - last) / 1000 * (value.rate ?? 1) * 3)) {
            this.clockSince = this.frameSince = now;
            return;
        }
        if (value.time > old.time + .001)
            this.clockSince = now;
        const frames = Number.isFinite(value.frames) && Number.isFinite(old.frames) && Number.isFinite(value.frameIntervalMs);
        if (!frames || value.frames !== old.frames || value.frameIntervalMs !== old.frameIntervalMs)
            this.frameSince = now;
        if (now - this.clockSince >= timeoutMs)
            return 'clock';
        // Sparse video must have several expected frames overdue before rejection.
        if (frames && now - this.frameSince >= Math.max(timeoutMs, value.frameIntervalMs * 3))
            return 'video';
    }
}
