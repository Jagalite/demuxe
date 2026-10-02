// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode, TrackTypePolicy } from '../../types.js';
import type { PlaybackSettings } from './settings.js';
import { type PolicyTrack } from './track-policy.js';
export type TrackSelectionFacts = Readonly<{
    sourceId: number;
    session: number | null;
    inventory: readonly (PolicyTrack & Readonly<{
        backendId: string;
        key: string;
    }>)[];
    policy: TrackTypePolicy | undefined;
    plan: string | undefined;
    surfaceLocked: boolean;
    automaticLossless: boolean;
}>;
type Context = Readonly<{
    mode: PlaybackMode;
    automatic: boolean;
    hasSource: boolean;
    hasBackend: boolean;
    sourceId: number;
    session: number | null;
}>;
export type TrackSelectionDecision = Readonly<{
    action: 'none' | 'direct' | 'select' | 'replace' | 'remember';
    value: string;
    key: string | null;
    rejection?: Readonly<{
        reason: 'invalid' | 'unsupported';
        message: string;
    }>;
}>;
export declare function decideTrackSelection(settings: Readonly<PlaybackSettings>, context: Context, type: 'audio' | 'sub', id: string | null, facts: TrackSelectionFacts): TrackSelectionDecision;
export declare function decideSubtitleVisibility(settings: Readonly<PlaybackSettings>, context: Context, value: boolean, facts: Readonly<{
    policy: TrackTypePolicy | undefined;
    hasTracks: boolean;
    surfaceLocked: boolean;
    plan: string | undefined;
}>): Readonly<{
    action: 'none' | 'direct' | 'select';
    promote: boolean;
    rejection?: string;
}>;
export {};
