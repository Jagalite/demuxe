// SPDX-License-Identifier: Apache-2.0
import { resourceScopeKey } from '../machine/protocol.js';
import { createEffectRuntimeState, effectRuntimeWork, transitionEffectRuntime } from '../machine/effect-runtime.js';
/** Host interpreter for the deliberately small effect vocabulary. Not wired into
 * Player. machine/effect-runtime owns admission, execution and settlement state. */
export class EffectRuntime {
    options;
    state;
    handles = new Map();
    constructor(options) {
        this.options = options;
        this.state = createEffectRuntimeState(options.maxPending);
    }
    get pendingCount() { return this.state.pending.length; }
    transition(input) {
        const decision = transitionEffectRuntime(this.state, input);
        this.state = decision.state;
        return decision;
    }
    submit(input) {
        // Normalize host records before entering the reducer; getters can reenter.
        const sourceScope = input.scope, scope = { owner: sourceScope.owner, lifetime: sourceScope.lifetime, sourceId: sourceScope.sourceId, sessionId: sourceScope.sessionId, operationId: sourceScope.operationId };
        const kind = input.kind, identity = { id: input.id, scope, lane: input.lane };
        const observed = kind === 'timer.wait' ? { ...identity, kind, deadlineMs: input.deadlineMs } : { ...identity, kind, resourceId: input.resourceId };
        const admission = this.transition({ type: 'admit', effect: observed });
        if (!admission.accepted)
            throw new Error(admission.reason === 'identity' ? 'Effect ID must increase' : admission.reason === 'disposed' ? 'Effect runtime is disposed' : 'Effect queue is full');
        const effect = effectRuntimeWork(this.state, observed.id).effect;
        let resolve;
        const result = new Promise(done => { resolve = done; });
        const handle = { controller: new AbortController(), resolve };
        this.handles.set(effect.id, handle);
        // Transient scheduler observation, not work lifecycle authority. A scheduler
        // may invoke its callback synchronously and then throw after work completed.
        let schedulerInvoked = false;
        const start = () => {
            const current = this.current(effect), retiredCleanup = this.retiredCleanup(effect);
            const decision = this.transition({ type: 'start', id: effect.id, current, retiredCleanup });
            if (!decision.accepted)
                return;
            schedulerInvoked = true;
            this.deliver(decision.outcomes);
            if (!decision.execute)
                return;
            try {
                // Preserve browser user activation by invoking before promise wrapping.
                const operation = this.execute(decision.execute, handle.controller.signal);
                Promise.resolve(operation).then(() => this.finish(effect, true), () => this.finish(effect, false));
            }
            catch {
                this.finish(effect, false);
            }
        };
        if (effect.lane === 'immediate')
            start();
        else
            try {
                const cancel = this.options.schedule(start);
                if (!effectRuntimeWork(this.state, effect.id))
                    cancel();
                else
                    handle.unschedule = cancel;
            }
            catch (error) {
                if (schedulerInvoked)
                    this.observerError(error);
                else
                    this.deliver(this.transition({ type: 'schedule-failed', id: effect.id }).outcomes);
            }
        return result;
    }
    /** Logical retirement settles callers even if an external operation ignores abort. */
    retireStale() {
        for (const { effect } of this.state.pending) {
            const retiredCleanup = this.retiredCleanup(effect), current = this.current(effect);
            this.deliver(this.transition({ type: 'retire', id: effect.id, current, retiredCleanup }).outcomes);
        }
    }
    dispose() {
        this.deliver(this.transition({ type: 'dispose' }).outcomes);
        // The owner retires the registry separately and awaits physical cleanup.
    }
    retiredCleanup(effect) { return effect.kind === 'resource.release' && this.options.resources.isScopeRetired(resourceScopeKey(effect.scope)); }
    current(effect) {
        if (this.state.disposed || !effectRuntimeWork(this.state, effect.id))
            return false;
        try {
            return this.options.isCurrent(effect.scope);
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
    finish(effect, success) {
        const current = this.current(effect);
        this.deliver(this.transition({ type: 'physical-result', id: effect.id, success, current }).outcomes);
    }
    observerError(error) { try {
        this.options.onObserverError?.(error);
    }
    catch { /* Observer failures cannot change settlement. */ } }
    deliver(outcomes) {
        // The reducer removed every outcome before abort handlers/observers reenter.
        for (const outcome of outcomes) {
            const handle = this.handles.get(outcome.id);
            if (!handle)
                continue;
            this.handles.delete(outcome.id);
            const cancel = handle.unschedule;
            handle.unschedule = undefined;
            try {
                cancel?.();
            }
            catch { /* Settlement must continue. */ }
            if (outcome.kind === 'retired')
                handle.controller.abort();
            handle.resolve(outcome);
            try {
                this.options.onOutcome?.(outcome);
            }
            catch (error) {
                this.observerError(error);
            }
        }
    }
}
