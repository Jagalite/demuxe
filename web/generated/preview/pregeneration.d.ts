// SPDX-License-Identifier: Apache-2.0
import type { PreviewPregeneration } from '../types.js';
export type PregenerationRequest = {
    time: number;
    width: number;
    height: number;
};
export type AdaptivePregeneration = {
    strategy: 'adaptive';
    samples: number;
    every: number;
    radius: number;
};
/** One lazy candidate at a time; never allocates a duration-sized work queue. */
export declare class PreviewPregenerator {
    private bucket;
    private run;
    private timer?;
    private epoch;
    private index;
    private duration;
    private enabled;
    private finished;
    private running;
    private readonly samples?;
    private readonly sampleOrder?;
    private readonly times?;
    private readonly step;
    private readonly limit;
    private readonly width;
    private readonly height;
    private adaptive?;
    private focus;
    private visited;
    constructor(config: PreviewPregeneration | AdaptivePregeneration, bucket: number, run: (request: PregenerationRequest) => Promise<'next' | 'wait' | 'stop'>);
    setDuration(duration: number | null): void;
    setEnabled(value: boolean): void;
    setFocus(time: number): void;
    reset(): void;
    stop(): void;
    private cancelTimer;
    private schedule;
    private tick;
    private key;
}
