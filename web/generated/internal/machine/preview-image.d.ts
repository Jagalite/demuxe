// SPDX-License-Identifier: Apache-2.0
/** Read bounded raster headers before asking the browser to allocate decoded pixels.
 * Unknown formats fail closed; preview failure never changes the playback route. */
export declare function previewImageDimensions(bytes: Uint8Array): {
    width: number;
    height: number;
};
