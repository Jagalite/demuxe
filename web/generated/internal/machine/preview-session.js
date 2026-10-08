// SPDX-License-Identifier: Apache-2.0
/** Concurrent software decode is conservative until the host explicitly opts in.
 * Unknown dimensions never qualify for the small-source allowance. */
export function previewMayRunDuringPlayback(policy, software, width, height) {
    if (policy === 'defer')
        return false;
    if (policy === 'allow' || !software)
        return true;
    return !!width && !!height && Number.isFinite(width * height) && width > 0 && height > 0 && width * height <= 1280 * 720;
}
/** Canvas decoders can publish coded-size metadata before display geometry.
 * Their independent sessions have no display filters, so prefer demux geometry.
 * Browser video dimensions already include aspect and rotation. */
export function previewSourceDimensions(display, demux, inspected = {}, preferDemux = false) {
    const valid = (size) => !!size.width && !!size.height && Number.isFinite(size.width * size.height) && size.width > 0 && size.height > 0;
    const pixelAspect = demux.pixelAspect, rotation = demux.rotation;
    const alternative = valid(demux) ? demux : valid(inspected) ? inspected : undefined;
    if (!(preferDemux && valid(demux)) && valid(display) && !(display.width === 2 && display.height === 2 && alternative && (alternative.width > 2 || alternative.height > 2)))
        return { width: display.width, height: display.height };
    if (valid(demux)) {
        const width = demux.width * (typeof pixelAspect === 'number' && Number.isFinite(pixelAspect) && pixelAspect > 0 ? pixelAspect : 1), height = demux.height;
        const radians = (typeof rotation === 'number' && Number.isFinite(rotation) ? rotation : 0) * Math.PI / 180, cos = Math.abs(Math.cos(radians)), sin = Math.abs(Math.sin(radians));
        return { width: Math.max(1, Math.round(width * cos + height * sin)), height: Math.max(1, Math.round(width * sin + height * cos)) };
    }
    if (valid(inspected))
        return { width: inspected.width, height: inspected.height };
    return undefined;
}
