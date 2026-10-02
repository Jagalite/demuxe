// SPDX-License-Identifier: Apache-2.0
import type { PlaybackMode } from '../../types.js';
import type { MediaObservation } from '../machine/media-info.js';
/** Shell capture only: normalize primitive fields and detach every collection.
 * No surface, property map, callback or raw backend record enters the core. */
export declare function captureMediaObservation(properties: ReadonlyMap<string, unknown>, mode: PlaybackMode, surface?: HTMLCanvasElement | HTMLVideoElement): MediaObservation;
