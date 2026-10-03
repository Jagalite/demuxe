// SPDX-License-Identifier: Apache-2.0
/** Detached inspection and browser-answer DTOs. No host objects or query callbacks. */
export type ProbeTrack = {
    id: string;
    index: number;
    type: string;
    codec: string;
    codecString?: string;
    webCodecsSupported?: boolean;
    title?: string;
    lang?: string;
    default?: boolean;
    forced?: boolean;
    channels?: number;
    aacObject?: number;
    attachedPicture?: boolean;
    sampleRate?: number;
    bitrate?: number;
    framerate?: number;
    frameTiming?: {
        startTime: number;
        endTime: number;
        maxIntervalSeconds: number;
    };
    initialPadding?: number;
    bits?: number;
    startTime?: number;
    endTime?: number;
    width?: number;
    height?: number;
};
export type Probe = {
    tracks: ProbeTrack[];
    duration: number;
    format?: string;
    hybridRejection?: string;
    identity?: {
        size: string;
        etag?: string;
    };
};
export type DecodingQuery = {
    track: number;
    configuration: {
        type: 'file' | 'media-source' | 'webrtc';
        audio?: {
            contentType: string;
            channels?: string;
            bitrate?: number;
            samplerate?: number;
        };
        video?: {
            contentType: string;
            width: number;
            height: number;
            bitrate: number;
            framerate: number;
        };
    };
    container?: string;
    status: 'answered' | 'unavailable' | 'timeout' | 'error';
    supported?: boolean;
    smooth?: boolean;
    powerEfficient?: boolean;
    reason?: string;
    late?: boolean;
};
export type DecodingEvidence = {
    api: 'decodingInfo';
    queries: DecodingQuery[];
    unqueriedTracks: number[];
    scope: 'advisory';
    reason?: string;
};
export type BrowserMediaCapability = {
    status: 'supported' | 'unsupported' | 'unknown';
    api: 'canPlayType' | 'isTypeSupported';
    tracks: Array<{
        index: number;
        type: string;
        codec: string;
        codecString?: string;
        serializationComplete: boolean;
        adapted?: boolean;
    }>;
    queries: Array<{
        mime: string;
        result: string | boolean;
        adapter: string;
        negativeDecisive: boolean;
        reason?: string;
    }>;
    decodingInfo?: DecodingEvidence;
    unqueriedAudio?: boolean;
    reason?: string;
};
/** Browser capability promises have no cancellation API. Timeout does not free
 * an outstanding physical query slot; only its actual settlement does. */
export type MediaQueryState = Readonly<{
    retired: boolean;
    serial: number;
    pending: readonly number[];
}>;
export declare function initialMediaQueries(): MediaQueryState;
export declare function admitMediaQuery(state: MediaQueryState): Readonly<{
    state: MediaQueryState;
    id: number | null;
}>;
export declare function mediaQueryCurrent(state: MediaQueryState, id: number): boolean;
export declare function finishMediaQuery(state: MediaQueryState, id: number): MediaQueryState;
export declare function retireMediaQueries(state: MediaQueryState): MediaQueryState;
