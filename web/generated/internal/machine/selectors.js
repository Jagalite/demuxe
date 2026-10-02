// SPDX-License-Identifier: Apache-2.0
import { selectCapabilities } from './capabilities.js';
import { copyData } from './data.js';
import { selectMediaInfo } from './media-info.js';
const different = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
/** Ordered names for a non-reentrant publication. Delivery, observer errors and
 * reconciliation after reentrant commands remain responsibilities of the shell. */
export function publicationEvents(previous, next, loopActive) {
    if (previous && !different(previous, next))
        return Object.freeze([]);
    const events = ['statechange'];
    if (!previous)
        return Object.freeze(events);
    for (const [event, a, b] of [
        ['sourcechange', previous.sourceId, next.sourceId], ['durationchange', previous.duration, next.duration],
        ['trackschange', [previous.audioTracks, previous.subtitleTracks], [next.audioTracks, next.subtitleTracks]],
        ['capabilitieschange', previous.capabilities, next.capabilities], ['volumechange', [previous.volume, previous.muted], [next.volume, next.muted]],
        ['ratechange', previous.playbackRate, next.playbackRate], ['timeupdate', previous.currentTime, next.currentTime],
    ])
        if (different(a, b))
            events.push(event);
    if (previous.playbackIntent !== next.playbackIntent && next.playbackIntent === 'play')
        events.push('play');
    if (previous.status !== next.status) {
        const statusEvents = { playing: 'playing', paused: 'pause', buffering: 'waiting', ended: 'ended' };
        const event = statusEvents[next.status];
        if (event && !(event === 'ended' && loopActive))
            events.push(event);
    }
    return Object.freeze(events);
}
/** Inactive read-only candidate: no effects, subscriptions, clocks or resource
 * operations. Status, capabilities and event decisions share one input tuple. */
export function projectPlayer(previous, input) {
    const o = input.observation, hasSession = input.sourceId !== null;
    const list = hasSession ? copyData(input.tracks) : [];
    const live = o.nativeLive ?? input.requestedLive, duration = live ? null : o.duration;
    const streamType = !input.sourcePresent ? 'unknown' : live ? 'live' : duration !== null ? 'vod' : 'unknown';
    const seekable = !hasSession ? null : input.mode === 'native' ? o.nativeSeekable : live ? o.cacheSeekable : o.seekable === false ? [] : o.seekable === true && duration !== null ? [{ start: 0, end: duration }] : null;
    const audioTracks = list.filter(track => track.type === 'audio'), subtitleTracks = list.filter(track => track.type === 'subtitle');
    const capabilities = selectCapabilities({ ...input.capabilityFacts, mode: input.mode, hasSession, automaticSelection: input.automaticSelection, previousDuration: previous?.duration, backendNativeLive: o.nativeLive === true }, seekable, audioTracks.length, subtitleTracks.length);
    const status = !hasSession ? (input.error ? 'error' : 'idle') : input.error ? 'error' : o.eof ? 'ended' : input.pause || o.paused ? 'paused' : input.observedWaiting || o.pausedForCache || o.nativeWaiting ? 'buffering' : input.observedPlaying ? 'playing' : 'paused';
    const next = {
        status, playbackIntent: input.pause ? 'pause' : 'play', pendingOperation: input.pendingOperation, sourceId: input.sourceId,
        currentTime: Math.max(0, o.time || 0), duration, streamType, subtitlesVisible: input.subtitlesVisible, volume: input.volumePercent / 100, muted: input.muted, playbackRate: input.playbackRate,
        activeMode: hasSession ? input.mode : null, automaticSelection: input.automaticSelection, buffered: input.mode === 'native' && hasSession ? o.nativeBuffered : null, seekable,
        cached: hasSession && input.mode !== 'native' ? o.cached : null,
        timing: input.timing, loop: input.loop, playbackRange: input.playbackRange, streaming: input.streaming, audioOutputDevice: input.audioOutputDevice, trackPolicy: input.trackPolicy,
        audioTracks, subtitleTracks, mediaInfo: selectMediaInfo(input.media, list, input.sourceId), capabilities, error: input.error,
    };
    const changed = !previous || different(previous, next), state = previous && !changed ? previous : copyData(next);
    return Object.freeze({ state, changed, notifications: changed ? publicationEvents(previous, state, !!input.loop) : Object.freeze([]),
        preview: Object.freeze({ playbackActive: !input.pause, suspended: input.busy || input.operationActive || !input.pause && (input.observedWaiting || o.pausedForCache || o.nativeWaiting), duration: hasSession && !input.busy && streamType === 'vod' ? duration : null, position: next.currentTime }),
        enforceBoundary: changed && !!previous,
    });
}
