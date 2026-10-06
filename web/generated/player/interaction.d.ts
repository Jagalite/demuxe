// SPDX-License-Identifier: Apache-2.0
export declare function formatTime(value: number): string;
export declare function outputDimensions(ratio: number): {
    width: number;
    height: number;
};
/** UI seeks follow the requested direction across holes and stay inside the current window. */
export declare function resolveSeekTarget(time: number, ranges: readonly {
    start: number;
    end: number;
}[] | null, position: number, limit?: {
    start: number;
    end: number;
} | null): number | null;
export declare function shortcut(event: KeyboardEvent, spaceControlsPlayback?: boolean): string | null;
