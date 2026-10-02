function emptyStatistics() {
    return Object.freeze({ sourceId: null, sessionEpoch: 0, acceptedAtMs: null, openToAcceptanceMs: null, firstPlayingMs: null, lastSeekMs: null, seekCount: 0, rebufferCount: 0, rebufferMs: 0, decodedFrames: null, presentedFrames: null, droppedFrames: null, throughputBitsPerSecond: null });
}
export function createPlaybackStatistics() {
    return Object.freeze({ data: emptyStatistics(), waitingAt: null });
}
function firstPlaying(state, observation) {
    return observation.status === 'playing' && state.data.firstPlayingMs === null && state.data.acceptedAtMs !== null;
}
function waiting(state, observation) {
    return observation.status === 'buffering' && observation.playbackIntent === 'play' && !observation.operationPending && state.data.firstPlayingMs !== null;
}
/** Sampling is a shell effect. Preserve the previous lazy clock-read cadence:
 * ordinary progressing observations and nonwaiting snapshots need no clock. */
export function playbackStatisticsClockReads(state, command) {
    if (command.kind === 'snapshot')
        return state.waitingAt === null ? 0 : 1;
    if (command.kind === 'accept')
        return Number(state.waitingAt !== null) + Number(!command.preserve);
    if (command.kind !== 'observe' || command.observation.sourceId === null)
        return 0;
    const buffering = waiting(state, command.observation);
    return Number(firstPlaying(state, command.observation)) + Number(buffering ? state.waitingAt === null : state.waitingAt !== null);
}
/** Accepted observations only: session/source retirement is checked by the
 * owning playback machine before it submits telemetry, matching existing use. */
export function transitionPlaybackStatistics(state, input) {
    if (input.timestamps.length !== playbackStatisticsClockReads(state, input))
        throw new RangeError('Unexpected statistics timestamp count');
    if (input.kind === 'clear')
        return createPlaybackStatistics();
    let data = state.data, waitingAt = state.waitingAt, index = 0;
    const finishWaiting = () => { if (waitingAt !== null) {
        data = { ...data, rebufferMs: data.rebufferMs + input.timestamps[index++] - waitingAt };
        waitingAt = null;
    } };
    if (input.kind === 'accept') {
        finishWaiting();
        if (!input.preserve)
            data = { ...emptyStatistics(), sourceId: input.sourceId, acceptedAtMs: input.timestamps[index++], openToAcceptanceMs: input.elapsed };
        data = { ...data, sessionEpoch: data.sessionEpoch + 1 };
    }
    else if (input.kind === 'seek') {
        if (data.sourceId === null)
            return state;
        data = { ...data, lastSeekMs: input.milliseconds, seekCount: data.seekCount + 1 };
    }
    else {
        const observation = input.observation;
        if (observation.sourceId === null)
            return state;
        if (firstPlaying(state, observation))
            data = { ...data, firstPlayingMs: input.timestamps[index++] - data.acceptedAtMs };
        const buffering = observation.status === 'buffering' && observation.playbackIntent === 'play' && !observation.operationPending && data.firstPlayingMs !== null;
        if (buffering && waitingAt === null) {
            waitingAt = input.timestamps[index++];
            data = { ...data, rebufferCount: data.rebufferCount + 1 };
        }
        if (!buffering)
            finishWaiting();
    }
    return data === state.data && waitingAt === state.waitingAt ? state : Object.freeze({ data: Object.freeze({ ...data }), waitingAt });
}
/** Project elapsed waiting time without advancing or mutating stored counters. */
export function selectPlaybackStatistics(state, now) {
    if (state.waitingAt !== null && now === undefined)
        throw new RangeError('Waiting statistics require a sampled timestamp');
    return Object.freeze({ ...state.data, rebufferMs: state.data.rebufferMs + (state.waitingAt === null ? 0 : now - state.waitingAt) });
}
export function createNativeProgress() {
    return Object.freeze({ previous: null, lastSample: null, clockSince: 0, frameSince: 0 });
}
export function resetNativeProgress(state) {
    return state.previous === null && state.lastSample === null ? state : Object.freeze({ ...state, previous: null, lastSample: null });
}
/** Pure sampled-progress policy. Ineligible samples do not spend a failure
 * budget; suspension, seeks and rate changes establish fresh observation epochs. */
export function sampleNativeProgress(state, now, value, timeoutMs) {
    const old = state.previous, last = state.lastSample;
    if (!value.eligible || !Number.isFinite(value.time))
        return Object.freeze({ state: resetNativeProgress(state), stalled: undefined });
    const previous = Object.freeze({ ...value });
    let clockSince = state.clockSince, frameSince = state.frameSince, stalled;
    if (!old || last === null || now < last || now - last > 2000 || value.rate !== old.rate || value.time < old.time || value.time - old.time > Math.max(2, (now - last) / 1000 * (value.rate ?? 1) * 3))
        clockSince = frameSince = now;
    else {
        if (value.time > old.time + .001)
            clockSince = now;
        const frames = Number.isFinite(value.frames) && Number.isFinite(old.frames) && Number.isFinite(value.frameIntervalMs);
        if (!frames || value.frames !== old.frames || value.frameIntervalMs !== old.frameIntervalMs)
            frameSince = now;
        if (now - clockSince >= timeoutMs)
            stalled = 'clock';
        else if (frames && now - frameSince >= Math.max(timeoutMs, value.frameIntervalMs * 3))
            stalled = 'video';
    }
    return Object.freeze({ state: Object.freeze({ previous, lastSample: now, clockSince, frameSince }), stalled });
}
