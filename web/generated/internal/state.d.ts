// SPDX-License-Identifier: Apache-2.0
import type { MediaInfo, MediaTrack, TimeRange, PlaybackMode } from '../types.js';
export declare function freeze<T>(value: T): T;
export declare function ranges(value: unknown): readonly TimeRange[] | null;
/** Packet caches can include negative preroll PTS before the public timeline. */
export declare function cachedRanges(value: unknown): readonly TimeRange[] | null;
export type RawTrack = Record<string, any>;
export declare function usesRemuxTracks(plan?: string): boolean;
export declare function trackKey(track: RawTrack, mode: PlaybackMode, plan?: string): string;
export declare function tracks(raw: RawTrack[], sourceId: number, mode: PlaybackMode, plan?: string): MediaTrack[];
export declare function mediaInfo(properties: ReadonlyMap<string, unknown>, mode: PlaybackMode, surface: HTMLCanvasElement | HTMLVideoElement | undefined, list: MediaTrack[]): MediaInfo;
