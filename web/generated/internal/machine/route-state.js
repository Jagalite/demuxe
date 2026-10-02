// SPDX-License-Identifier: Apache-2.0
import { copyData } from './data.js';
import { initialDiscovery, transitionDiscovery } from './route-discovery.js';
import { initialInspection, transitionInspection } from './route-inspection.js';
export function initialRouting() { return Object.freeze({ discovery: initialDiscovery(), inspection: initialInspection(), plans: Object.freeze([]), attempts: Object.freeze([]), context: Object.freeze({ automatic: false }) }); }
export function transitionRouting(state, input) {
    if (input.type === 'routing.discovery') {
        const discovery = transitionDiscovery(state.discovery, input.change);
        return discovery === state.discovery ? state : Object.freeze({ ...state, discovery, ...(input.change.kind === 'reinspected' ? { context: Object.freeze({ nativeReason: discovery.current?.nativeReason, automatic: discovery.current?.automatic ?? state.context.automatic }) } : {}) });
    }
    if (input.type === 'routing.inspection')
        return Object.freeze({ ...state, inspection: transitionInspection(state.inspection, input.change) });
    if (input.type === 'routing.plans')
        return Object.freeze({ ...state, plans: copyData(input.plans) });
    if (input.type === 'routing.context')
        return Object.freeze({ ...state, context: copyData(input.context) });
    if (input.type === 'routing.attempts')
        return Object.freeze({ ...state, attempts: copyData(input.attempts.slice(-32)) });
    if (input.type === 'routing.attempt')
        return Object.freeze({ ...state, attempts: copyData([...state.attempts.slice(-31), input.attempt]) });
    if (input.type === 'routing.reject')
        return Object.freeze({ ...state, plans: Object.freeze(state.plans.map(plan => plan.id === input.id ? copyData({ ...plan, eligible: false, code: input.code, reason: input.reason }) : plan)) });
    return Object.freeze({ ...state, plans: Object.freeze(state.plans.map(plan => { const answer = input.answers.find(answer => answer.id === plan.id); return answer && plan.browserCapability ? copyData({ ...plan, browserCapability: { ...plan.browserCapability, decodingInfo: answer.evidence } }) : plan; })) });
}
