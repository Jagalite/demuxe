// SPDX-License-Identifier: Apache-2.0
import type { PreviewPregeneration } from '../types.js';
import { type AdaptivePregeneration, type CustomPregeneration, type PregenerationRequest, type PregenerationOutcome } from '../internal/machine/preview-pregeneration.js';
export type { PregenerationRequest, AdaptivePregeneration, CustomPregeneration } from '../internal/machine/preview-pregeneration.js';
/** Owns only a timer and provider callback; scheduling authority is immutable. */
export declare class PreviewPregenerator {
    private run;
    private candidates?;
    private timer?;
    private state;
    constructor(config: PreviewPregeneration | AdaptivePregeneration | CustomPregeneration, bucket: number, run: (request: PregenerationRequest) => Promise<PregenerationOutcome>, candidates?: ((duration: number, focus: number) => readonly number[]) | undefined);
    setDuration(duration: number | null): void;
    setEnabled(enabled: boolean): void;
    setFocus(time: number, resident?: readonly number[]): void;
    reset(): void;
    stop(): void;
    private dispatch;
}
