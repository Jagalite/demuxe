// SPDX-License-Identifier: Apache-2.0
import { readTierFailure, preferredPlanIndices } from './machine/routing.js';
import { initialTierOwner, transitionTierOwner } from './machine/route-evidence.js';
function localTierStore() {
    let state = initialTierOwner();
    return { read: () => state, change(change, revision) { const next = transitionTierOwner(state, change, revision), accepted = next !== state; state = next; return accepted; } };
}
/** Object identity and clock reads stay here; Player evidence shares its one
 * composed authority, while standalone utility instances have a local owner. */
export class TierAttempts {
    store;
    sources = new WeakMap();
    identityEpoch = -1;
    constructor(store = localTierStore()) {
        this.store = store;
    }
    key(source, configuration, plan) {
        const owner = this.store.read();
        if (this.identityEpoch !== owner.identityEpoch) {
            this.sources = new WeakMap();
            this.identityEpoch = owner.identityEpoch;
        }
        let id = this.sources.get(source);
        if (!id) {
            if (!this.store.change({ kind: 'identity' }, owner.revision))
                return undefined;
            id = this.store.read().serial;
            this.sources.set(source, id);
        }
        return `${id}:${configuration}:${plan}`;
    }
    failure(source, configuration, plan, reason, now = performance.now()) {
        const key = this.key(source, configuration, plan);
        if (key === undefined)
            return;
        this.store.change({ kind: 'failure', key, reason, now }, this.store.read().revision);
    }
    reason(source, configuration, plan, now = performance.now()) {
        const key = this.key(source, configuration, plan);
        if (key === undefined)
            return undefined;
        const previous = this.store.read(), result = readTierFailure(previous.value, key, now);
        this.store.change({ kind: 'read', key, now }, previous.revision);
        return result.reason;
    }
    clear() { this.store.change({ kind: 'clear' }, this.store.read().revision); }
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export function preferredPlans(plans, current) {
    return preferredPlanIndices(plans.map(plan => ({ id: plan.id, eligible: plan.eligible })), current).map(index => plans[index]);
}
