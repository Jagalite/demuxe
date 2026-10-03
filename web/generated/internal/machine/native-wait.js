// SPDX-License-Identifier: Apache-2.0
export function beginNativeEventWait(request, event, now, loadBudget, prefetchAfterMs) {
    const loading = event === 'loadeddata' || event === 'loadedmetadata', budget = loading ? loadBudget : 25000;
    return Object.freeze({ request: Object.freeze({ ...request }), event, loading, budget, deadline: now + budget, prefetchDeadline: loading && prefetchAfterMs !== undefined ? now + prefetchAfterMs : undefined, prefetched: false });
}
export function nativeEventWaitCurrent(waits, request) { return waits.some(wait => wait.request.id === request.id && wait.request.epoch === request.epoch); }
export function nativeEventWaitDeadline(waits, request, now) {
    const wait = waits.find(wait => wait.request.id === request.id && wait.request.epoch === request.epoch);
    if (!wait)
        return;
    return now < wait.deadline ? Object.freeze({ remaining: wait.deadline - now }) : Object.freeze({ event: wait.event, loading: wait.loading, budget: wait.budget });
}
