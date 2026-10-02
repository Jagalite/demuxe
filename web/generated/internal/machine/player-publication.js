// SPDX-License-Identifier: Apache-2.0
import { copyData } from './data.js';
import { projectPlayer } from './selectors.js';
import { createPlaybackStatistics, transitionPlaybackStatistics } from './telemetry.js';
export function initialPlayerPublication() { return Object.freeze({ serial: 0, queueSerial: 0, queued: null, snapshot: null, prepared: null, statistics: createPlaybackStatistics(), error: null, operationStart: null }); }
export function retirePlayerPublication(state) { return Object.freeze({ ...state, serial: state.serial + 1, prepared: null, operationStart: null }); }
export function clearPlayerPublication(state) { return Object.freeze({ ...retirePlayerPublication(state), statistics: createPlaybackStatistics(), error: null }); }
export function acceptPlayerPublication(state, sourceId, preserve, timing) {
    // Pure callers may have no clock observation. Retain unavailable metrics
    // explicitly instead of fabricating elapsed time from a wall-clock default.
    const previous = preserve ? state.statistics.data : createPlaybackStatistics().data;
    const statistics = timing ? transitionPlaybackStatistics(state.statistics, { kind: 'accept', sourceId, preserve, ...timing }) : Object.freeze({ waitingAt: null, data: Object.freeze({ ...previous, sourceId, sessionEpoch: previous.sessionEpoch + 1 }) });
    return Object.freeze({ ...state, serial: state.serial + 1, prepared: null, statistics, error: null });
}
export function transitionPlayerPublication(state, input) {
    const old = state.publication;
    const done = (publication, extra = {}) => Object.freeze({ state: Object.freeze({ ...state, revision: state.revision + 1, publication }), accepted: true, retire: Object.freeze([]), ...extra });
    const no = () => Object.freeze({ state, accepted: false, reason: 'retired', retire: Object.freeze([]) });
    if (input.type === 'publication.schedule') {
        if (old.queued !== null)
            return no();
        const id = old.queueSerial + 1;
        return done(Object.freeze({ ...old, queueSerial: id, queued: id }), { id });
    }
    if (input.type === 'publication.scheduled')
        return old.queued === input.id ? done(Object.freeze({ ...old, queued: null })) : no();
    if (input.type === 'publication.begin') {
        const id = old.serial + 1;
        return done(Object.freeze({ ...old, serial: id, prepared: null }), { id });
    }
    if (input.type === 'publication.prepare') {
        if (input.id !== old.serial || input.captureRevision !== state.captureRevision)
            return no();
        const projection = projectPlayer(old.snapshot ?? undefined, input.input);
        return done(Object.freeze({ ...old, prepared: Object.freeze({ id: input.id, captureRevision: state.captureRevision, projection }) }), { id: input.id, publication: projection });
    }
    if (input.type === 'publication.commit') {
        const prepared = old.prepared;
        if (input.id !== old.serial || prepared?.id !== input.id || prepared.captureRevision !== state.captureRevision || input.captureRevision !== state.captureRevision)
            return no();
        const projection = prepared.projection, next = projection.state;
        const statistics = projection.changed ? transitionPlaybackStatistics(old.statistics, { kind: 'observe', observation: { sourceId: next.sourceId, status: next.status, playbackIntent: next.playbackIntent, operationPending: !!next.pendingOperation }, timestamps: input.timestamps }) : old.statistics;
        return done(Object.freeze({ ...old, prepared: null, snapshot: next, statistics }), { id: input.id, publication: projection });
    }
    if (input.epoch !== state.operations.epoch)
        return no();
    if (input.type === 'publication.error')
        return input.session === state.source.acceptedSession && (!state.operations.terminal || input.error === null) ? done(Object.freeze({ ...old, error: copyData(input.error) })) : no();
    if (state.operations.terminal || state.operations.active !== input.id || !state.operations.entries.some(entry => entry.id === input.id && entry.epoch === input.epoch && !entry.cancelled))
        return no();
    if (input.type === 'publication.operation-start')
        return old.operationStart?.id === input.id && old.operationStart.epoch === input.epoch ? no() : done(Object.freeze({ ...old, operationStart: Object.freeze({ id: input.id, epoch: input.epoch, now: input.now, seekRecorded: false }) }));
    if (old.operationStart?.id !== input.id || old.operationStart.epoch !== input.epoch || old.operationStart.seekRecorded)
        return no();
    const statistics = transitionPlaybackStatistics(old.statistics, { kind: 'seek', milliseconds: input.now - old.operationStart.now, timestamps: Object.freeze([]) });
    return done(Object.freeze({ ...old, statistics, operationStart: Object.freeze({ ...old.operationStart, seekRecorded: true }) }));
}
