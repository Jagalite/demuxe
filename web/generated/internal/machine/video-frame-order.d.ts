// SPDX-License-Identifier: Apache-2.0
/** H.264 7.3.2.1 / E.1.1 / E.2.1: derive the presentation reorder bound
 * from every declared SPS. No browser sniffing or fixture-specific lookahead. */
export declare function videoReorderDepth(kind: number, description: Uint8Array): number;
export type FrameOrder = Readonly<{
    depth: number | null;
    frames: readonly Readonly<{
        id: number;
        pts: number;
    }>[];
    last: number | null;
}>;
export declare function initialFrameOrder(depth?: number | null): FrameOrder;
export declare function admitOrderedFrame(state: FrameOrder, id: number, pts: number): Readonly<{
    state: FrameOrder;
    error?: string;
}>;
export declare function orderedFrameReady(state: FrameOrder, flushed: boolean): boolean;
export declare function takeOrderedFrame(state: FrameOrder, flushed: boolean): Readonly<{
    state: FrameOrder;
    id: number | null;
}>;
export declare function orderedPacketLimit(state: FrameOrder): number;
