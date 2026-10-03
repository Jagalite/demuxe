// SPDX-License-Identifier: Apache-2.0
export function initialPlayback() { return Object.freeze({ serial: 0, plays: Object.freeze([]), seeks: Object.freeze([]), latestSeek: null, observedPlaying: false, observedWaiting: false, sampleSession: null, sampleSequence: 0 }); }
/** Logical play verification and latest-seek lifetimes are distinct from FIFO
 * operation lifetime. The shell resolves IDs to physical abort controllers. */
export function transitionPlayback(state, input) {
    if ((input.type === 'play.request' || input.type === 'seek.request') && (state.plays.length + state.seeks.length >= 128 || !Number.isSafeInteger(state.serial + 1)))
        return Object.freeze({ state, id: undefined, retire: Object.freeze([]) });
    switch (input.type) {
        case 'play.request': {
            const id = state.serial + 1;
            return Object.freeze({ state: Object.freeze({ ...state, serial: id, plays: Object.freeze([...state.plays, id]) }), id, retire: Object.freeze([]) });
        }
        case 'play.retire': return Object.freeze({ state: Object.freeze({ ...state, plays: Object.freeze([]) }), retire: state.plays });
        case 'play.settled': return Object.freeze({ state: Object.freeze({ ...state, plays: Object.freeze(state.plays.filter(id => id !== input.id)) }), retire: Object.freeze([]) });
        case 'seek.request': {
            const id = state.serial + 1;
            return Object.freeze({ state: Object.freeze({ ...state, serial: id, seeks: Object.freeze([...state.seeks, id]), latestSeek: input.latest ? id : state.latestSeek }), id, retire: Object.freeze(input.latest && state.latestSeek !== null ? [state.latestSeek] : []) });
        }
        case 'seek.settled': return Object.freeze({ state: Object.freeze({ ...state, seeks: Object.freeze(state.seeks.filter(id => id !== input.id)), latestSeek: state.latestSeek === input.id ? null : state.latestSeek }), retire: Object.freeze([]) });
        case 'playback.observed': return Object.freeze({ state: Object.freeze({ ...state, observedPlaying: input.playing ?? state.observedPlaying, observedWaiting: input.waiting ?? state.observedWaiting }), retire: Object.freeze([]) });
    }
}
