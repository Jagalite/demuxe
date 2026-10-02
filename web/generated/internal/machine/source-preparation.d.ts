// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode, SubtitleStyle } from '../../types.js';
import type { PlaybackSettings } from './settings.js';
/** Source bytes, options, backend methods and promise instances stay in the adapter. */
export type SourcePreparationFacts = Readonly<{
    mode: PlaybackMode;
    settings: Readonly<PlaybackSettings>;
    videoFilters: string;
    subtitleDelay: number;
    audioDelay: number;
    subtitleStyle: Readonly<SubtitleStyle>;
    overlapping: boolean;
    muted: boolean;
}>;
export type SourcePreparationCommand = Readonly<{
    kind: 'ready' | 'configured' | 'open';
}> | Readonly<{
    kind: 'command';
    property: string;
    value: string;
}> | Readonly<{
    kind: 'gain' | 'volume' | 'rate';
    value: number;
}> | Readonly<{
    kind: 'track';
    track: 'audio' | 'sub';
    value: string;
}> | Readonly<{
    kind: 'subtitles';
    value: boolean;
}>;
export type SourcePreparationEffect = SourcePreparationCommand & Readonly<{
    step: number;
}>;
export type SourcePreparation = Readonly<{
    commands: readonly SourcePreparationCommand[];
    cursor: number;
    pending: number | null;
}>;
export declare function initialSourcePreparation(): SourcePreparation;
/** A claim advances authority before same-stack adapter calls. A second claimant
 * cannot issue the same command while its physical result is outstanding. */
export declare function claimSourcePreparation(state: SourcePreparation): Readonly<{
    state: SourcePreparation;
    accepted: boolean;
    effect?: SourcePreparationEffect;
}>;
export declare function completeSourcePreparation(state: SourcePreparation, step: number, facts?: SourcePreparationFacts): Readonly<{
    state: SourcePreparation;
    accepted: boolean;
    phase?: 'opening' | 'applying';
}>;
export declare function sourcePreparationDone(state: SourcePreparation): boolean;
