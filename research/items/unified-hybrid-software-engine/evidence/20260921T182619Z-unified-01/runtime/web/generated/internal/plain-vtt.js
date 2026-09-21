// SPDX-License-Identifier: GPL-3.0-or-later
import { PlayerError } from './errors.js';
/** This renderer failed independently of video/audio packaging. */
export class BrowserCaptionUnsupported extends PlayerError {
    constructor(message) { super('UNSUPPORTED_FEATURE', message); }
}
const cache = new WeakMap();
/** Conservative external caption contract. Rich VTT remains with the existing renderer.
 * No conversion, cue settings, markup, region, CSS or timestamp-map interpretation. */
export function plainVTT(asset) {
    if (asset.format !== 'vtt')
        return;
    if (cache.has(asset))
        return cache.get(asset) ?? undefined;
    let text;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(asset.bytes).replace(/\r\n?/g, '\n');
    }
    catch {
        throw new Error('Invalid UTF-8 WebVTT');
    }
    if (!text.startsWith('WEBVTT\n\n')) {
        cache.set(asset, null);
        return;
    }
    const time = (s) => { const m = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(s); return m ? Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000 : NaN; };
    const cues = [];
    for (const block of text.slice(8).replace(/\n+$/, '').split(/\n\n+/)) {
        const lines = block.split('\n'), timing = lines.shift();
        const parts = timing.split(' --> ');
        if (parts.length !== 2 || /\s/.test(parts[1]) || !lines.length || lines.some(line => /[<>&\u0000-\u0008\u000b-\u001f]/.test(line))) {
            cache.set(asset, null);
            return;
        }
        const start = time(parts[0]), end = time(parts[1]);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
            throw new Error('Invalid plain WebVTT cue timing');
        cues.push({ start, end, text: lines.join('\n') });
    }
    if (!cues.length) {
        cache.set(asset, null);
        return;
    }
    cache.set(asset, cues);
    return cues;
}
