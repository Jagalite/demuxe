// SPDX-License-Identifier: Apache-2.0
import type { ShakaBackendState } from './shaka-backend.js';
export type ShakaAudioFacts = Readonly<{
    language?: string | null;
    originalLanguage?: string | null;
    label?: string | null;
    roles?: readonly string[] | null;
    spatialAudio?: boolean | null;
    accessibilityPurpose?: string | null;
    channelsCount?: number | null;
    codecs?: string | null;
    active?: boolean;
}>;
export type ShakaSelectionVariant = Readonly<{
    id: number;
    active?: boolean;
    audioLanguage?: string | null;
    language?: string | null;
    originalLanguage?: string | null;
    label?: string | null;
    audioRoles?: readonly string[] | null;
    spatialAudio?: boolean | null;
    accessibilityPurpose?: string | null;
    channelsCount?: number | null;
    audioCodec?: string | null;
    videoCodec?: string | null;
    originalVideoId?: string | null;
    originalAudioId?: string | null;
    bandwidth: number;
    height?: number | null;
}>;
export declare function shakaAudioCatalog(tracks: readonly ShakaAudioFacts[]): readonly Readonly<{
    index: number;
    id: string;
    ambiguous: boolean;
}>[];
export type ShakaAudioSelection = Readonly<{
    kind: 'disabled';
}> | Readonly<{
    kind: 'empty';
}> | Readonly<{
    kind: 'failure';
    reason: 'identity' | 'pin' | 'constraints';
}> | Readonly<{
    kind: 'audio';
    index: number;
}> | Readonly<{
    kind: 'variant';
    index: number;
    variant: number;
    commitQuality: boolean;
}>;
export declare function shakaRequestedAudio(tracks: readonly ShakaAudioFacts[], id: string): Readonly<{
    kind: 'disabled';
}> | Readonly<{
    kind: 'empty';
}> | Readonly<{
    kind: 'failure';
    reason: 'identity';
}> | Readonly<{
    kind: 'selected';
    index: number;
}>;
export declare function shakaSelectAudio(state: ShakaBackendState, tracks: readonly ShakaAudioFacts[], variants: readonly ShakaSelectionVariant[], id: string): ShakaAudioSelection;
export declare function shakaInitialRepresentation(variants: readonly ShakaSelectionVariant[], representation: string): number | null;
export declare function shakaSelectText(tracks: readonly Readonly<{
    id: number;
    active?: boolean;
}>[], id: string): number | null;
export declare function shakaExpectedOutput(variants: readonly ShakaSelectionVariant[], audioDisabled: boolean): Readonly<{
    video: boolean;
    audio: boolean;
}>;
