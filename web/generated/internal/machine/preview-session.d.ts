// SPDX-License-Identifier: Apache-2.0
/** Concurrent software decode is conservative until the host explicitly opts in.
 * Unknown dimensions never qualify for the small-source allowance. */
export declare function previewMayRunDuringPlayback(policy: 'auto' | 'allow' | 'defer', software: boolean, width?: number, height?: number): boolean;
type Size = Readonly<{
    width?: number;
    height?: number;
}>;
/** Canvas decoders can publish coded-size metadata before display geometry.
 * Their independent sessions have no display filters, so prefer demux geometry.
 * Browser video dimensions already include aspect and rotation. */
export declare function previewSourceDimensions(display: Size, demux: Size & Readonly<{
    pixelAspect?: number;
    rotation?: number;
}>, inspected?: Size, preferDemux?: boolean): {
    width: number;
    height: number;
} | undefined;
export {};
