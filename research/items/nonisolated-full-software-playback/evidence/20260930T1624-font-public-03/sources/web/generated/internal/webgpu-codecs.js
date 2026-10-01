// SPDX-License-Identifier: Apache-2.0
// Internal qualification registry. Each JSON-shaped entry names a device-local
// adapter module and its generated assets relative to web/webgpu/codecs/.
// The packager reads this literal object; keep entries JSON-compatible.
// Empty until a real codec passes correctness, lifecycle and performance gates.
export const qualifiedWebGPUCodecs = Object.freeze({});
export function webgpuDecoderSupported(codec) {
    return Object.hasOwn(qualifiedWebGPUCodecs, codec);
}
export function hasQualifiedWebGPUCodecs() {
    return Object.keys(qualifiedWebGPUCodecs).length > 0;
}
