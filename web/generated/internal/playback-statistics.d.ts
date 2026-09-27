// SPDX-License-Identifier: Apache-2.0
import type { PlaybackStats, PlayerState } from '../types.js';
/** Bounded, source-scoped observations; no backend counter inference. */
export declare class PlaybackStatistics {
    private now;
    private data;
    private waitingAt;
    constructor(now?: () => number);
    private empty;
    clear(): void;
    accept(sourceId: number, preserve: boolean, elapsed: number): void;
    seek(milliseconds: number): void;
    private finishWaiting;
    observe(state: PlayerState): void;
    snapshot(): PlaybackStats;
}
