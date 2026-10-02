// SPDX-License-Identifier: Apache-2.0
import type { MediaInfo, MediaTrack, PlaybackMode } from '../../types.js';
export type MediaGeometryObservation = Readonly<{
    displayWidth: number | null;
    displayHeight: number | null;
    width: number | null;
    height: number | null;
    pixelAspectRatio: number | null;
    /** Present nonnumeric rotation suppresses the raw-track fallback in legacy code. */
    rotationPresent: boolean;
    rotation: number | null;
}>;
export type MediaVideoParamsObservation = MediaGeometryObservation & Readonly<{
    primaries: string | null;
    transfer: string | null;
    matrix: string | null;
    range: string | null;
}>;
export type MediaChapterObservation = Readonly<{
    index: number | null;
    time: number | null;
    title: string | null;
}>;
export type MediaTagObservation = Readonly<{
    key: string;
    value: string | null;
}>;
/** Detached observations only. Non-finite numeric rotation is retained to match
 * the existing projection; it must not be silently JSON-round-tripped as null. */
export type MediaObservation = Readonly<{
    mode: PlaybackMode;
    videoSurface: Readonly<{
        width: number | null;
        height: number | null;
    }> | null;
    videoOutput: MediaVideoParamsObservation | null;
    videoInput: MediaVideoParamsObservation | null;
    selectedRawVideo: MediaGeometryObservation | null;
    chapters: readonly MediaChapterObservation[] | null;
    tags: readonly MediaTagObservation[] | null;
    chapterCoverage: 'partial' | 'complete';
    tagCoverage: 'partial' | 'complete';
    duration: number | null;
}>;
/** Pure projection; freeze only owned records, reusing fully frozen track DTOs.
 * The raw selected-video observation and public (policy-filtered) track list
 * remain distinct, as in the existing mediaInfo implementation. */
export declare function selectMediaInfo(observation: MediaObservation, tracks: readonly MediaTrack[], sourceId?: number | null): MediaInfo;
