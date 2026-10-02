// SPDX-License-Identifier: Apache-2.0
import { copyData } from './data.js';
export function initialRouting() { return Object.freeze({ plans: Object.freeze([]), attempts: Object.freeze([]), context: Object.freeze({ automatic: false }) }); }
export function transitionRouting(state, input) {
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
