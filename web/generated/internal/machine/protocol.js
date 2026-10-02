// SPDX-License-Identifier: Apache-2.0
/** Structural identity checks never inspect live resources or ambient time. */
export function sameEffectScope(a, b) {
    return a.owner === b.owner && a.lifetime === b.lifetime && a.sourceId === b.sourceId &&
        a.sessionId === b.sessionId && a.operationId === b.operationId && a.playId === b.playId;
}
/** Resource lifetime excludes operation ID: a session outlives the opening command. */
export function resourceScopeKey(scope) {
    return JSON.stringify([scope.owner, scope.lifetime, scope.sourceId, scope.sessionId]);
}
