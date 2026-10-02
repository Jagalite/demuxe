// SPDX-License-Identifier: Apache-2.0
import type { MediaTrack, PlaybackMode, PlayerState, TimeRange } from '../../types.js';
import { type CapabilityFacts } from './capabilities.js';
import { type MediaObservation } from './media-info.js';
/** Sampled data only. Null ranges mean unknown; [] means known empty.
 * Numeric time preserves the legacy projection's +Infinity behavior until an
 * explicit compatibility correction. No clock is read by this projection. */
export type PlaybackObservation = Readonly<{
    time: number;
    duration: number | null;
    nativeLive: boolean | null;
    eof: boolean;
    paused: boolean;
    pausedForCache: boolean;
    nativeWaiting: boolean;
    seekable: boolean | null;
    nativeSeekable: readonly TimeRange[] | null;
    nativeBuffered: readonly TimeRange[] | null;
    cacheSeekable: readonly TimeRange[] | null;
    cached: readonly TimeRange[] | null;
}>;
/** This is a projection input, not a second authoritative Player store. The
 * future composed transition will supply accepted control state and observations. */
export type PlayerProjectionInput = Readonly<{
    sourceId: number | null;
    sourcePresent: boolean;
    requestedLive: boolean;
    mode: PlaybackMode;
    automaticSelection: boolean;
    pause: boolean;
    subtitlesVisible: boolean;
    volumePercent: number;
    muted: boolean;
    playbackRate: number;
    pendingOperation: PlayerState['pendingOperation'];
    error: PlayerState['error'];
    observedPlaying: boolean;
    observedWaiting: boolean;
    busy: boolean;
    operationActive: boolean;
    observation: PlaybackObservation;
    media: MediaObservation;
    tracks: readonly MediaTrack[];
    timing: PlayerState['timing'];
    loop: PlayerState['loop'];
    playbackRange: PlayerState['playbackRange'];
    streaming: PlayerState['streaming'];
    audioOutputDevice: string;
    trackPolicy: PlayerState['trackPolicy'];
    capabilityFacts: Omit<CapabilityFacts, 'mode' | 'hasSession' | 'automaticSelection' | 'previousDuration' | 'backendNativeLive'>;
}>;
export type PublicationEvent = 'statechange' | 'sourcechange' | 'durationchange' | 'trackschange' | 'capabilitieschange' | 'volumechange' | 'ratechange' | 'timeupdate' | 'play' | 'playing' | 'pause' | 'waiting' | 'ended';
export type PreviewProjection = Readonly<{
    playbackActive: boolean;
    suspended: boolean;
    duration: number | null;
    position: number;
}>;
export type PlayerProjection = Readonly<{
    state: PlayerState;
    changed: boolean;
    notifications: readonly PublicationEvent[];
    preview: PreviewProjection;
    enforceBoundary: boolean;
}>;
/** Ordered names for a non-reentrant publication. Delivery, observer errors and
 * reconciliation after reentrant commands remain responsibilities of the shell. */
export declare function publicationEvents(previous: PlayerState | undefined, next: PlayerState, loopActive: boolean): readonly PublicationEvent[];
/** Inactive read-only candidate: no effects, subscriptions, clocks or resource
 * operations. Status, capabilities and event decisions share one input tuple. */
export declare function projectPlayer(previous: PlayerState | undefined, input: PlayerProjectionInput): PlayerProjection;
