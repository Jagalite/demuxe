// SPDX-License-Identifier: Apache-2.0
const positive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
const finite = (value) => typeof value === 'number' && Number.isFinite(value) ? value : null;
const text = (value) => typeof value === 'string' ? value : null;
const numericRotation = (value) => typeof value === 'number' ? value : null;
function params(value) {
    // Legacy code selects video-out-params by truthiness, including an empty object.
    if (!value)
        return null;
    const data = value;
    return Object.freeze({ displayWidth: positive(data.dw), displayHeight: positive(data.dh), width: positive(data.w), height: positive(data.h), pixelAspectRatio: positive(data.par),
        rotationPresent: data.rotate !== null && data.rotate !== undefined, rotation: numericRotation(data.rotate),
        primaries: text(data.primaries), transfer: text(data.gamma), matrix: text(data.colormatrix), range: text(data.colorlevels) });
}
function rawVideo(value) {
    if (!value)
        return null;
    return Object.freeze({ displayWidth: null, displayHeight: null, width: positive(value['demux-w']), height: positive(value['demux-h']), pixelAspectRatio: positive(value['demux-par']),
        rotationPresent: value['demux-rotation'] !== null && value['demux-rotation'] !== undefined, rotation: numericRotation(value['demux-rotation']) });
}
function chapter(value) {
    const data = value;
    return Object.freeze({ index: finite(data?.index), time: finite(data?.time), title: text(data?.title) });
}
/** Shell capture only: normalize primitive fields and detach every collection.
 * No surface, property map, callback or raw backend record enters the core. */
export function captureMediaObservation(properties, mode, surface) {
    const selected = properties.get('track-list')?.find(track => track.type === 'video' && track.selected);
    const chapters = properties.get('chapter-list'), tags = properties.get('metadata');
    const video = surface?.tagName === 'VIDEO' ? surface : undefined;
    return Object.freeze({
        mode, videoSurface: video ? Object.freeze({ width: positive(video.videoWidth), height: positive(video.videoHeight) }) : null,
        videoOutput: params(properties.get('video-out-params')), videoInput: params(properties.get('video-params')), selectedRawVideo: rawVideo(selected),
        chapters: Array.isArray(chapters) ? Object.freeze(chapters.map(chapter)) : null,
        tags: tags && typeof tags === 'object' ? Object.freeze(Object.entries(tags).filter(([key, value]) => key.length <= 256 && typeof value === 'string' && value.length <= 4096).slice(0, 128).map(([key, value]) => Object.freeze({ key, value: value }))) : null,
        chapterCoverage: properties.get('chapter-coverage') === 'partial' ? 'partial' : 'complete',
        tagCoverage: properties.get('tag-coverage') === 'partial' ? 'partial' : 'complete', duration: positive(properties.get('duration')),
    });
}
