// SPDX-License-Identifier: Apache-2.0
/** Configuration-scoped negative evidence. Never caches transport or deadlines. */
export class TierAttempts {
    sources = new WeakMap();
    serial = 0;
    failures = new Map();
    key(source, configuration, plan) { let id = this.sources.get(source); if (!id) {
        id = ++this.serial;
        this.sources.set(source, id);
    } return `${id}:${configuration}:${plan}`; }
    failure(source, configuration, plan, reason, now = performance.now()) {
        const key = this.key(source, configuration, plan);
        this.failures.delete(key);
        this.failures.set(key, { reason, until: now + 60000 });
        if (this.failures.size > 64)
            this.failures.delete(this.failures.keys().next().value);
    }
    reason(source, configuration, plan, now = performance.now()) {
        const key = this.key(source, configuration, plan), value = this.failures.get(key);
        if (value && value.until > now)
            return value.reason;
        this.failures.delete(key);
    }
    clear() { this.failures.clear(); this.sources = new WeakMap(); }
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export function preferredPlans(plans, current) {
    const index = plans.findIndex(p => p.id === current);
    return index < 0 ? [] : plans.slice(0, index).filter(p => p.eligible);
}
