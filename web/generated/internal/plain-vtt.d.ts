// SPDX-License-Identifier: Apache-2.0
import { PlayerError } from './errors.js';
/** This renderer failed independently of video/audio packaging. */
export declare class BrowserCaptionUnsupported extends PlayerError {
    constructor(message: string);
}
import type { SubtitleAsset } from '../types.js';
export type PlainCue = {
    start: number;
    end: number;
    text: string;
};
/** Conservative external caption contract. Rich VTT remains with the existing renderer.
 * No conversion, cue settings, markup, region, CSS or timestamp-map interpretation. */
export declare function plainVTT(asset: SubtitleAsset): PlainCue[] | undefined;
