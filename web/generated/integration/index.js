// SPDX-License-Identifier: Apache-2.0
import { Player } from '../unified-player.js';
import { PlayerError, playerError } from '../internal/errors.js';
import { initialBindingState, transitionBinding, bindingSubscriptionActive, bindingDiagnostics, initialSelectorState, transitionSelector } from '../internal/machine/bindings.js';
/** Initial delivery and Object.is equality by default. Observer failures are isolated. */
export function subscribeSelector(source, select, listener, equal = Object.is) {
    let control = initialSelectorState(), value;
    const unsubscribe = source.subscribe(state => {
        if (!control.active)
            return;
        try {
            const next = select(state);
            if (!control.active)
                return;
            const matches = control.initialized && equal(value, next), decision = transitionSelector(control, { type: 'observe', equal: matches });
            control = decision.state;
            if (!decision.deliver)
                return;
            value = next;
            listener(next);
        }
        catch { /* Observers never affect playback. */ }
    });
    return () => { if (!control.active)
        return; control = transitionSelector(control, { type: 'stop' }).state; unsubscribe(); };
}
/** Application owns sources. Disposal never cancels accepted or unrelated core work. */
export class PlaybackBinding {
    runtime;
    ownership;
    options;
    sourceAuthority = 'application';
    control;
    cleanup;
    listeners = new Map();
    constructor(runtime, ownership, options = {}) {
        this.runtime = runtime;
        this.ownership = ownership;
        this.options = options;
        this.control = initialBindingState(ownership);
        if (runtime.isDestroyed)
            throw new PlayerError('ABORTED', 'Cannot bind a destroyed runtime');
    }
    get state() { return this.runtime.state; }
    get disposed() { return this.control.disposed; }
    get diagnostics() { return bindingDiagnostics(this.control); }
    transition(command) { const decision = transitionBinding(this.control, command); this.control = decision.state; if (decision.error)
        throw new PlayerError(decision.error.code, decision.error.message); return decision; }
    release(id) { const stop = this.listeners.get(id); this.listeners.delete(id); stop?.(); }
    subscribe(listener) {
        const id = this.transition({ type: 'subscribe', runtimeDestroyed: this.runtime.isDestroyed }).subscriptionId;
        try {
            const release = this.runtime.subscribe(state => { if (this.transition({ type: 'notify', id }).deliver)
                try {
                    listener(state);
                }
                catch { } });
            if (bindingSubscriptionActive(this.control, id))
                this.listeners.set(id, release);
            else
                release();
        }
        catch (error) {
            this.transition({ type: 'unsubscribe', id });
            throw error;
        }
        return () => { for (const release of this.transition({ type: 'unsubscribe', id }).release ?? [])
            this.release(release); };
    }
    /** Invoke immediately, preserving browser activation. Retain canonical completion. */
    run(operation) {
        const sourceId = this.runtime.state.sourceId;
        try {
            this.transition({ type: 'run', runtimeDestroyed: this.runtime.isDestroyed });
            return Promise.resolve(operation()).catch(error => { throw this.report(error, sourceId); });
        }
        catch (error) {
            return Promise.reject(this.report(error, sourceId));
        }
    }
    report(error, sourceId) { const safe = playerError(error); if (!this.control.disposed)
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
        let resolve, reject;
        this.cleanup = new Promise((yes, no) => { resolve = yes; reject = no; });
        const decision = this.transition({ type: 'dispose' }), errors = [];
        for (const id of decision.release ?? [])
            try {
                this.release(id);
            }
            catch (error) {
                errors.push(error);
            }
        const finish = () => { if (errors.length)
            reject(errors.length === 1 ? errors[0] : new AggregateError(errors, 'Binding cleanup failed'));
        else
            resolve(); };
        try {
            if (decision.destroyRuntime)
                Promise.resolve(this.runtime.destroy()).then(finish, error => { errors.push(error); finish(); });
            else
                finish();
        }
        catch (error) {
            errors.push(error);
            finish();
        }
        return this.cleanup;
    }
}
export function bindPlayer(player, options = {}) { return new PlaybackBinding(player, 'borrowed', options); }
export function createPlayerBinding(container, options = {}, bindingOptions = {}) {
    const player = new Player(container, options);
    return { player, binding: new PlaybackBinding(player, 'owned', bindingOptions) };
}
