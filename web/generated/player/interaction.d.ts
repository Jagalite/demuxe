// SPDX-License-Identifier: Apache-2.0
export declare function formatTime(value: number): string;
export declare function outputDimensions(ratio: number): {
    width: number;
    height: number;
};
type SeekWindow = Readonly<{
    start: number;
    end: number;
}>;
/** Timeline geometry and position shortcuts share the active seekable envelope.
 * Holes remain on the timeline; resolveSeekTarget chooses their directional edge. */
export declare function seekBounds(ranges: readonly SeekWindow[] | null, limit?: SeekWindow | null): SeekWindow | null;
/** UI seeks follow the requested direction across holes and stay inside the current window. */
export declare function resolveSeekTarget(time: number, ranges: readonly SeekWindow[] | null, position: number, limit?: SeekWindow | null): number | null;
export declare function shortcut(event: KeyboardEvent, spaceControlsPlayback?: boolean): string | null;
export {};
