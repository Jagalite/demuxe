// SPDX-License-Identifier: Apache-2.0
import { resourceScopeKey } from '../machine/protocol.js';
/** Shell interpreter for the first, deliberately small effect vocabulary.
 * Not wired into Player. No routing/selection decisions belong in this class.
 */
export class EffectRuntime {
    options;
    highWatermark = 0;
    pending = new Map();
    disposed = false;
    limit;
    constructor(options) {
        this.options = options;
        this.limit = options.maxPending ?? 32;
        if (!Number.isSafeInteger(this.limit) || this.limit < 1)
            throw new Error('Invalid pending effect limit');
    }
    get pendingCount() { return this.pending.size; }
    submit(input) {
        // Copy caller-owned records; callers cannot retarget scheduled effects.
        const effect = Object.freeze({ ...input, scope: Object.freeze({ ...input.scope }) });
        if (!Number.isSafeInteger(effect.id) || effect.id <= this.highWatermark)
            throw new Error('Effect ID must increase');
        this.highWatermark = effect.id;
        if (this.disposed)
            throw new Error('Effect runtime is disposed');
        if (this.pending.size >= this.limit)
            throw new Error('Effect queue is full');
        let resolve;
        const result = new Promise(done => { resolve = done; });
        const work = { effect, controller: new AbortController(), resolve, settled: false, started: false };
        this.pending.set(effect.id, work);
        const start = () => {
            if (work.settled || work.started)
                return;
            work.started = true;
            if (!this.current(work) && !this.retiredCleanup(work)) {
                this.finish(work, { kind: 'retired' });
                return;
            }
            try {
                // Execute before wrapping in a promise to preserve browser user activation.
                const operation = this.execute(effect, work.controller.signal);
                Promise.resolve(operation).then(() => this.finish(work, this.current(work) ? { kind: 'completed' } : { kind: 'retired' }), () => this.finish(work, this.current(work) ? { kind: 'failed', error: { code: 'EFFECT_FAILED', message: 'Effect execution failed' } } : { kind: 'retired' }));
            }
            catch {
                this.finish(work, this.current(work) ? { kind: 'failed', error: { code: 'EFFECT_FAILED', message: 'Effect execution failed' } } : { kind: 'retired' });
            }
        };
        if (effect.lane === 'immediate')
            start();
        else
            try {
                const cancel = this.options.schedule(start);
                if (work.settled)
                    cancel();
                else
                    work.unschedule = cancel;
            }
            catch (error) {
                if (work.started) {
                    try {
                        this.options.onObserverError?.(error);
                    }
                    catch { }
                }
                else
                    this.finish(work, { kind: 'failed', error: { code: 'EFFECT_FAILED', message: 'Effect scheduling failed' } });
            }
        return result;
    }
    /** Logical retirement settles callers even if an external operation ignores abort. */
    retireStale() {
        for (const work of [...this.pending.values()])
            if (!this.retiredCleanup(work) && !this.current(work))
                this.finish(work, { kind: 'retired' });
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        for (const work of [...this.pending.values()])
            this.finish(work, { kind: 'retired' });
        // The owning shell retires the registry separately and awaits physical cleanup.
    }
    retiredCleanup(work) {
        return work.effect.kind === 'resource.release' && this.options.resources.isScopeRetired(resourceScopeKey(work.effect.scope));
    }
    current(work) {
        if (this.disposed || work.settled)
            return false;
        try {
            return this.options.isCurrent(work.effect.scope);
        }
        catch {
            return false;
        }
    }
    execute(effect, signal) {
        switch (effect.kind) {
            case 'backend.play': return this.options.resources.get(effect.resourceId, resourceScopeKey(effect.scope)).play();
            case 'backend.pause': return this.options.resources.get(effect.resourceId, resourceScopeKey(effect.scope)).pause();
            case 'resource.release': return this.options.resources.release(effect.resourceId, resourceScopeKey(effect.scope));
            case 'timer.wait':
                if (!Number.isFinite(effect.deadlineMs))
                    throw new Error('Invalid effect deadline');
                return effect.deadlineMs <= this.options.now() ? undefined : this.options.waitUntil(effect.deadlineMs, signal);
        }
    }
    finish(work, result) {
        if (work.settled)
            return;
        work.settled = true;
        this.pending.delete(work.effect.id);
        const detail = result.kind === 'failed' ? { ...result, error: Object.freeze({ ...result.error }) } : result;
        const outcome = Object.freeze({ id: work.effect.id, scope: work.effect.scope, ...detail });
        try {
            work.unschedule?.();
        }
        catch { /* Logical retirement still must settle. */ }
        work.unschedule = undefined;
        // Retirement is committed before abort handlers or observers can reenter.
        if (result.kind === 'retired')
            work.controller.abort();
        work.resolve(outcome);
        try {
            this.options.onOutcome?.(outcome);
        }
        catch (error) {
            try {
                this.options.onObserverError?.(error);
            }
            catch { /* An observer cannot break settlement. */ }
        }
    }
}
