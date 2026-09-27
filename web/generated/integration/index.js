// SPDX-License-Identifier: Apache-2.0
import { Player } from '../unified-player.js';
import { PlayerError, playerError } from '../internal/errors.js';
/** Initial delivery and Object.is equality by default. Observer failures are isolated. */
export function subscribeSelector(source, select, listener, equal = Object.is) {
    let active = true, initialized = false, value;
    const unsubscribe = source.subscribe(state => {
        if (!active)
            return;
        try {
            const next = select(state);
            if (initialized && equal(value, next))
                return;
            value = next;
            initialized = true;
            listener(next);
        }
        catch { /* Observers never affect playback. */ }
    });
    return () => { if (!active)
        return; active = false; unsubscribe(); };
}
/** Application owns sources. Disposal never cancels accepted or unrelated core work. */
export class PlaybackBinding {
    runtime;
    ownership;
    options;
    sourceAuthority = 'application';
    active = true;
    cleanup;
    listeners = new Set();
    notifications = 0;
    constructor(runtime, ownership, options = {}) {
        this.runtime = runtime;
        this.ownership = ownership;
        this.options = options;
        if (runtime.isDestroyed)
            throw new PlayerError('ABORTED', 'Cannot bind a destroyed runtime');
    }
    get state() { return this.runtime.state; }
    get disposed() { return !this.active; }
    get diagnostics() { return Object.freeze({ origin: 'integration', subscriptions: this.listeners.size, notifications: this.notifications }); }
    subscribe(listener) {
        this.assertActive();
        let live = true;
        const release = this.runtime.subscribe(state => { if (this.active && live) {
            this.notifications++;
            try {
                listener(state);
            }
            catch { }
        } });
        const stop = () => { if (!live)
            return; live = false; release(); this.listeners.delete(stop); };
        this.listeners.add(stop);
        if (!this.active)
            stop();
        return stop;
    }
    assertActive() { if (!this.active || this.runtime.isDestroyed)
        throw new PlayerError('ABORTED', 'Binding is disposed or runtime is destroyed'); }
    /** Invoke immediately, preserving browser activation. Retain canonical completion. */
    run(operation) {
        const sourceId = this.runtime.state.sourceId;
        try {
            this.assertActive();
            return Promise.resolve(operation()).catch(error => { throw this.report(error, sourceId); });
        }
        catch (error) {
            return Promise.reject(this.report(error, sourceId));
        }
    }
    report(error, sourceId) { const safe = playerError(error); if (this.active)
        try {
            this.options.onOperationError?.(Object.freeze({ origin: 'integration', sourceId, error: Object.freeze(safe.toJSON()) }));
        }
        catch { } return safe; }
    play() { return this.run(() => this.runtime.play()); }
    pause() { return this.run(() => this.runtime.pause()); }
    seek(time) { return this.run(() => this.runtime.seek(time)); }
    setVolume(value) { return this.run(() => this.runtime.setVolume(value)); }
    setMuted(value) { return this.run(() => this.runtime.setMuted(value)); }
    setPlaybackRate(value) { return this.run(() => this.runtime.setPlaybackRate(value)); }
    dispose() {
        if (this.cleanup)
            return this.cleanup;
        this.active = false;
        for (const stop of [...this.listeners])
            stop();
        let resolve, reject;
        this.cleanup = new Promise((yes, no) => { resolve = yes; reject = no; });
        try {
            if (this.ownership === 'owned')
                Promise.resolve(this.runtime.destroy()).then(resolve, reject);
            else
                resolve();
        }
        catch (error) {
            reject(error);
        }
        return this.cleanup;
    }
}
export function bindPlayer(player, options = {}) { return new PlaybackBinding(player, 'borrowed', options); }
export function createPlayerBinding(container, options = {}, bindingOptions = {}) {
    const player = new Player(container, options);
    return { player, binding: new PlaybackBinding(player, 'owned', bindingOptions) };
}
