// SPDX-License-Identifier: Apache-2.0
import type { CustomSource, MediaSourceInput, MediaInspection, InspectionOptions } from './types.js';
export declare const CUSTOM_SOURCE_PLAYBACK_LIMIT: number;
export declare function isCustomSource(value: unknown): value is CustomSource;
export declare function materializeSource(source: CustomSource, signal?: AbortSignal): Promise<File>;
/** Metadata only: no player, decode session, canvas, or audio output is created. */
export declare function inspectMedia(input: MediaSourceInput, options?: InspectionOptions): Promise<MediaInspection>;
