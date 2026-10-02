// SPDX-License-Identifier: Apache-2.0
import { transitionOperations } from './operations.js';
import { transitionPlayback } from './playback.js';
import { transitionSettings } from './settings.js';
import { transitionSource } from './source.js';
export function transitionPlayer(state, input) {
    if (input.type === 'playback.sample') {
        const previous = state.playback;
        if (state.operations.terminal || state.source.acceptedEpoch !== state.operations.epoch || state.source.candidate || input.session !== state.source.acceptedSession || input.session === previous.sampleSession && input.sequence <= previous.sampleSequence)
            return Object.freeze({ state, accepted: false, id: undefined, reason: 'retired', retire: Object.freeze([]) });
        const playing = input.observation === 'playing' || input.observation === 'time' && !state.settings.pause && typeof input.value === 'number' && input.value > (input.publishedTime ?? 0);
        const playback = Object.freeze({ ...previous, sampleSession: input.session, sampleSequence: input.sequence, observedPlaying: playing ? true : previous.observedPlaying, observedWaiting: playing ? false : input.observation === 'waiting' ? true : previous.observedWaiting });
        const settings = input.observation === 'pause' && input.value === true && state.operations.active === null ? Object.freeze({ ...state.settings, pause: true }) : state.settings;
        return Object.freeze({ state: Object.freeze({ ...state, revision: state.revision + 1, playback, settings }), accepted: true, id: undefined, reason: undefined, retire: Object.freeze([]) });
    }
    if (isSourceInput(input)) {
        const retired = state.operations.terminal || state.operations.entries.some(entry => entry.id === state.operations.active && entry.cancelled);
        const forward = input.type !== 'source.configure' && input.type !== 'source.clear' && input.type !== 'source.finished';
        const expired = input.type !== 'source.begin' && state.source.candidate?.operationEpoch !== state.operations.epoch;
        if (forward && (retired || expired))
            return Object.freeze({ state, accepted: false, id: undefined, reason: 'retired', retire: Object.freeze([]) });
        const decision = transitionSource(state.source, input.type === 'source.accept' ? { ...input, operationEpoch: state.operations.epoch } : input), settings = decision.settings ?? (input.type === 'source.clear' ? Object.freeze({ ...state.settings, pause: true, aid: 'auto', sid: 'auto' }) : state.settings);
        const playback = decision.settings || input.type === 'source.clear' ? Object.freeze({ ...state.playback, observedPlaying: false, observedWaiting: false, sampleSession: decision.state.acceptedSession, sampleSequence: 0 }) : state.playback;
        return Object.freeze({ ...decision, state: decision.state === state.source ? state : Object.freeze({ ...state, revision: state.revision + 1, source: decision.state, settings, playback }), id: decision.attempt, retire: Object.freeze([]) });
    }
    if (input.type === 'settings.accept' || input.type === 'settings.change')
        return Object.freeze({ state: Object.freeze({ ...state, revision: state.revision + 1, settings: transitionSettings(state.settings, input) }), accepted: true, id: undefined, reason: undefined, retire: Object.freeze([]) });
    if (input.type === 'play.request' || input.type === 'play.retire' || input.type === 'play.settled' || input.type === 'seek.request' || input.type === 'seek.settled' || input.type === 'playback.observed') {
        const decision = transitionPlayback(state.playback, input);
        return Object.freeze({ state: Object.freeze({ ...state, revision: state.revision + 1, playback: decision.state }), accepted: true, id: 'id' in decision ? decision.id : undefined, reason: undefined, retire: decision.retire });
    }
    const decision = transitionOperations(state.operations, input);
    return Object.freeze({ ...decision, state: decision.state === state.operations ? state : Object.freeze({ ...state, revision: state.revision + 1, operations: decision.state }), retire: Object.freeze([]) });
}
function isSourceInput(input) { return input.type.startsWith('source.'); }
/** A backend listener keeps its allocation identity. Retirement fences every
 * accepted-session effect, including errors/recovery, not just playback flags. */
export function sessionAuthority(state, session) {
    if (state.operations.terminal)
        return 'retired';
    if (state.source.acceptedSession === session && state.source.acceptedEpoch === state.operations.epoch)
        return 'accepted';
    const candidate = state.source.candidate;
    if (candidate?.session === session && candidate.operationEpoch === state.operations.epoch && !state.operations.entries.some(entry => entry.id === state.operations.active && entry.cancelled))
        return 'candidate';
    return 'retired';
}
