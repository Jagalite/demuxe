// SPDX-License-Identifier: Apache-2.0
export type StageTap = Readonly<{
    id: number;
    x: number;
    y: number;
    at: number;
    side: -1 | 0 | 1;
    source: number;
}>;
export type StageTaps = Readonly<{
    press?: StageTap;
    previous?: StageTap;
    seeking?: boolean;
}>;
export type StageTapCommand = Readonly<{
    type: 'cancel';
}> | Readonly<{
    type: 'down' | 'move' | 'up';
    tap: StageTap;
    eligible: boolean;
}>;
/** Recognize double taps, then continue seeking on each tap in the same burst. */
export declare function transitionStageTaps(state: StageTaps, command: StageTapCommand): Readonly<{
    state: StageTaps;
    seek?: -1 | 1;
}>;
