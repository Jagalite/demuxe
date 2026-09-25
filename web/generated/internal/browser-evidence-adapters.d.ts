// SPDX-License-Identifier: Apache-2.0
/** Query syntax and observable browser signals, never browser codec support tables. */
export declare function queryAdapter(api: 'canPlayType' | 'isTypeSupported', mime: string): {
    id: string;
    negativeDecisive: boolean;
    reason: string;
} | {
    id: string;
    negativeDecisive: boolean;
    reason?: undefined;
};
export type AudioEvidenceStrength = 'unknown' | 'presence' | 'decoded' | 'consumed';
export declare function observeBrowserAudio(media: {
    webkitAudioDecodedByteCount?: number;
    mozHasAudio?: boolean;
    audioTracks?: ArrayLike<{
        enabled: boolean;
    }>;
}, advancing: boolean): {
    adapter: string;
    ready: boolean;
    strength: AudioEvidenceStrength;
};
