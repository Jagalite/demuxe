import type { PlaybackStats, PlayerState } from '../types.js';
/** Bounded, source-scoped observations; no backend counter inference. */
export declare class PlaybackStatistics {
    private now;
    private state;
    constructor(now?: () => number);
    private timestamps;
    private apply;
    clear(): void;
    accept(sourceId: number, preserve: boolean, elapsed: number): void;
    seek(milliseconds: number): void;
    observe(state: PlayerState): void;
    snapshot(): PlaybackStats;
}
