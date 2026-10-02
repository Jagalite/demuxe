import type { WatchdogOptions, WatchdogPolicy } from '../types.js';
import { type NativeProgressSample } from './machine/telemetry.js';
export type { NativeProgressSample };
export declare function watchdogPolicy(options?: boolean | WatchdogOptions): WatchdogPolicy;
/** Sampled observations, not per-frame callbacks. Ineligible periods never spend
 * a failure budget; timer suspension and media discontinuities start fresh. */
export declare class NativeProgressWatchdog {
    private state;
    reset(): void;
    sample(now: number, value: NativeProgressSample, timeoutMs: number): 'clock' | 'video' | undefined;
}
