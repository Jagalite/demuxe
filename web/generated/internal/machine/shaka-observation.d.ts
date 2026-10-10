// SPDX-License-Identifier: Apache-2.0
import type { StreamingState, NetworkRecoveryState } from '../../types.js';
import { type ShakaBackendState, type ShakaVariantFacts } from './shaka-backend.js';
import { type ShakaAudioFacts } from './shaka-selection.js';
export type ShakaObservedVariant = ShakaVariantFacts & Readonly<{
    videoId?: number | null;
    width?: number | null;
    frameRate?: number | null;
    audioCodec?: string | null;
    hdr?: string | null;
}>;
export type ShakaObservedText = Readonly<{
    id: number;
    active: boolean;
    codecs?: string | null;
    mimeType?: string | null;
    label?: string | null;
    language?: string | null;
}>;
export declare function shakaStreamingProjection(state: ShakaBackendState, tracks: readonly ShakaObservedVariant[], observation: Readonly<{
    live: boolean;
    start: number;
    end: number;
    time: number;
    now: number;
    playheadDate: number | null;
    recovery?: NetworkRecoveryState;
}>): StreamingState;
export declare function shakaTrackProjection(state: ShakaBackendState, audio: readonly ShakaAudioFacts[], texts: readonly ShakaObservedText[], variants: readonly ShakaObservedVariant[]): Array<Record<string, unknown>>;
export declare function shakaSeekTarget(start: number, end: number, seconds: number): number | null;
export declare function shakaPreviewChoice(format: 'hls' | 'dash' | undefined, live: boolean, width: number, streams: readonly Readonly<{
    id: number;
    encrypted: boolean;
    indexed: boolean;
    mimeType: string;
}>[], tracks: readonly Readonly<{
    id: number;
    width: number | null;
}>[]): Readonly<{
    id: number;
    stream: number;
    createIndex: boolean;
}> | null;
