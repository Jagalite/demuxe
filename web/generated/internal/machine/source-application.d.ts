// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode, QualityPolicy, TrackTypePolicy } from '../../types.js';
import type { PlaybackSettings } from './settings.js';
import { type PolicyTrack } from './track-policy.js';
export type SourceApplicationFacts = Readonly<{
    mode: PlaybackMode;
    preserve: boolean;
    planId: string;
    settings: Readonly<PlaybackSettings>;
    requestedTarget?: number;
    quality: QualityPolicy | null;
    outputDevice: string;
    attachments: number;
    nativeTracks: number;
    indexes: readonly Readonly<{
        type: 'audio' | 'sub';
        index: number;
    }>[];
    externalSubtitleKey?: string;
    publicSelections: readonly Readonly<{
        type: 'audio' | 'sub';
        key: string;
    }>[];
    audioPolicy: boolean;
    subtitlePolicy: boolean;
}>;
type Track = 'audio' | 'sub';
export type SourceApplicationCommand = Readonly<{
    kind: 'target';
    target: number;
}> | Readonly<{
    kind: 'quality.inspect' | 'quality';
    policy: QualityPolicy;
}> | Readonly<{
    kind: 'output.inspect' | 'output';
    device: string;
}> | Readonly<{
    kind: 'metadata.inspect' | 'metadata' | 'applied';
}> | Readonly<{
    kind: 'attachment' | 'text';
    index: number;
}> | Readonly<{
    kind: 'track' | 'remember';
    type: Track;
    value: string;
    save: boolean;
}> | Readonly<{
    kind: 'subtitles';
    value: boolean;
    save: boolean;
}> | Readonly<{
    kind: 'resolve.index';
    type: Track;
    index: number;
}> | Readonly<{
    kind: 'resolve.external';
    key: string;
}> | Readonly<{
    kind: 'resolve.public';
    type: Track;
    key: string;
}> | Readonly<{
    kind: 'policy';
    type: Track;
}> | Readonly<{
    kind: 'verify';
    type: Track;
    value: string;
}> | Readonly<{
    kind: 'reject';
    code: 'INVALID_ARGUMENT' | 'UNSUPPORTED_FEATURE' | null;
    message: string;
}>;
export type SourceApplicationEffect = SourceApplicationCommand & Readonly<{
    step: number;
}>;
export type SourceApplication = Readonly<{
    mode: PlaybackMode;
    preserve: boolean;
    commands: readonly SourceApplicationCommand[];
    cursor: number;
    pending: number | null;
    settings: Readonly<PlaybackSettings>;
}>;
export type SourceApplicationObservation = Readonly<{
    kind: 'target';
    duration: number | null;
    live: boolean;
}> | Readonly<{
    kind: 'support';
    available: boolean;
}> | Readonly<{
    kind: 'tracks';
    remux: boolean;
    tracks: readonly Readonly<{
        id: string;
        type: string;
        index: number | null;
        key: string;
        publicKey: string;
    }>[];
}> | Readonly<{
    kind: 'policy';
    policy: TrackTypePolicy;
    tracks: readonly (PolicyTrack & Readonly<{
        backendId: string;
    }>)[];
}>;
export declare function initialSourceApplication(facts: SourceApplicationFacts): SourceApplication;
export declare function claimSourceApplication(state: SourceApplication): Readonly<{
    state: SourceApplication;
    accepted: boolean;
    effect?: SourceApplicationEffect;
}>;
export declare function sourceApplicationDone(state: SourceApplication): boolean;
export declare function completeSourceApplication(state: SourceApplication, step: number, observation?: SourceApplicationObservation): Readonly<{
    state: SourceApplication;
    accepted: boolean;
    applied?: boolean;
}>;
export {};
