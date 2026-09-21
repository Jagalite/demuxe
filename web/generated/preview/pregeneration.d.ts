// SPDX-License-Identifier: GPL-3.0-or-later
import type { PreviewPregeneration } from '../types.js';
export type PregenerationRequest = {
    time: number;
    width: number;
    height: number;
};
/** One lazy candidate at a time; never allocates a duration-sized work queue. */
export declare class PreviewPregenerator {
    private run;
    private timer?;
    private epoch;
    private index;
    private duration;
    private enabled;
    private finished;
    private running;
    private readonly times?;
    private readonly step;
    private readonly limit;
    private readonly width;
    private readonly height;
    constructor(config: PreviewPregeneration, bucket: number, run: (request: PregenerationRequest) => Promise<'next' | 'wait' | 'stop'>);
    setDuration(duration: number | null): void;
    setEnabled(value: boolean): void;
    reset(): void;
    stop(): void;
    private cancelTimer;
    private schedule;
    private tick;
}
