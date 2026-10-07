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
}>;
export type StageTapCommand = Readonly<{
    type: 'cancel';
}> | Readonly<{
    type: 'down' | 'move' | 'up';
    tap: StageTap;
    eligible: boolean;
}>;
/** Recognize two short, nearby taps on the same outer third of the same source. */
export declare function transitionStageTaps(state: StageTaps, command: StageTapCommand): Readonly<{
    state: StageTaps;
    seek?: -1 | 1;
}>;
