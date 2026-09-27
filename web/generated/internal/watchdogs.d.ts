// SPDX-License-Identifier: Apache-2.0
import type { WatchdogOptions, WatchdogPolicy } from '../types.js';
export declare function watchdogPolicy(options?: boolean | WatchdogOptions): WatchdogPolicy;
export type NativeProgressSample = {
    eligible: boolean;
    time: number;
    rate?: number;
    frames?: number;
    frameIntervalMs?: number;
    videoEnd?: number;
};
/** Sampled observations, not per-frame callbacks. Ineligible periods never spend
 * a failure budget; timer suspension and media discontinuities start fresh. */
export declare class NativeProgressWatchdog {
    private previous?;
    private lastSample?;
    private clockSince;
    private frameSince;
    reset(): void;
    sample(now: number, value: NativeProgressSample, timeoutMs: number): 'clock' | 'video' | undefined;
}
