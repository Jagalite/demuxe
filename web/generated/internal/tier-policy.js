// SPDX-License-Identifier: Apache-2.0
import { createTierAttempts, recordTierFailure, readTierFailure, preferredPlanIndices } from './machine/routing.js';
/** Object identity and clock reads stay here; negative-evidence policy is pure. */
export class TierAttempts {
    sources = new WeakMap();
    serial = 0;
    state = createTierAttempts();
    key(source, configuration, plan) { let id = this.sources.get(source); if (!id) {
        id = ++this.serial;
        this.sources.set(source, id);
    } return `${id}:${configuration}:${plan}`; }
    failure(source, configuration, plan, reason, now = performance.now()) {
        this.state = recordTierFailure(this.state, this.key(source, configuration, plan), reason, now);
    }
    reason(source, configuration, plan, now = performance.now()) {
        const result = readTierFailure(this.state, this.key(source, configuration, plan), now);
        this.state = result.state;
        return result.reason;
    }
    clear() { this.state = createTierAttempts(); this.sources = new WeakMap(); }
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export function preferredPlans(plans, current) {
    return preferredPlanIndices(plans.map(plan => ({ id: plan.id, eligible: plan.eligible })), current).map(index => plans[index]);
}
