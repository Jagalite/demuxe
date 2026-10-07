// SPDX-License-Identifier: Apache-2.0
import type { QualitySelectionContext, QualitySelectionDecision } from '../../types.js';
/** Preserve upgrades; request a responsive downgrade subject to backend safety. */
export declare function defaultQualitySelection(context: QualitySelectionContext): QualitySelectionDecision;
export declare function qualitySelection(context: QualitySelectionContext, decision: QualitySelectionDecision | undefined): Readonly<{
    id: string;
    urgency: 'buffered' | 'responsive';
}>;
/** Shaka applies safeMargin relative to the playhead when a deferred clear
 * actually runs. Its public API cannot pin removal to an absolute segment
 * boundary, so preserve buffered media for every requested urgency. */
export declare function qualitySwitchBuffer(): Readonly<{
    clearBuffer: boolean;
    safeMargin: number;
}>;
