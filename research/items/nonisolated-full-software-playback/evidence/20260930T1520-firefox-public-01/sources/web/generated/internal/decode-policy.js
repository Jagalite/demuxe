// SPDX-License-Identifier: Apache-2.0
export const supportsEmergencyFrameDrop = (codec) => ['mpeg2video', 'mpegvideo', 'h264', 'hevc'].includes(codec);
/** Only controls with a bounded reconstruction contract belong here. The
 * following screened controls are deliberately excluded: skip_frame=bidir,
 * skip_loop_filter=all, skip_idct=all, flags2=+fast, weakened err_detect,
 * disabled concealment, relaxed compliance and private H.264 recovery flags.
 * In particular, B-frame skipping and +fast changed retained pictures. */
export function resolveDecodePolicy(input) {
    const codec = (input.codec ?? 'unknown').toLowerCase();
    const interFrame = codec === 'h264' || codec === 'hevc';
    // MPEG-1 and MPEG-4 Part 2 remain candidates: focused browser seeks with
    // noref missed the requested retained picture or timed out intermittently.
    const emergency = supportsEmergencyFrameDrop(codec);
    const state = input.adaptiveState ?? 'normal';
    const filter = interFrame && (input.decodeQuality !== 'exact' || state !== 'normal');
    const omitGrain = codec === 'av1' && input.decodeQuality === 'performance';
    const dropping = emergency && state === 'drop-non-reference';
    const shortcuts = [];
    if (filter)
        shortcuts.push('skip_loop_filter=noref');
    if (omitGrain)
        shortcuts.push('libdav1d filmgrain=0');
    if (dropping)
        shortcuts.push('skip_frame=noref');
    // These are FFmpeg AVOption values: noref. mpv's vd-lavc-skipframe and
    // vd-lavc-skiploopfilter choices spell the same discard level nonref.
    // Keep the resource guard in the same vd-lavc-o assignment as AVOptions.
    const ffmpegOptions = { max_pixels: String(input.maxDecodePixels) };
    if (filter)
        ffmpegOptions.skip_loop_filter = 'noref';
    if (omitGrain)
        ffmpegOptions.filmgrain = '0';
    if (dropping)
        ffmpegOptions.skip_frame = 'noref';
    return { requested: input.decodeQuality, effective: filter && input.decodeQuality === 'exact' ? 'balanced' : filter || omitGrain ? input.decodeQuality : 'exact', codec,
        threads: 2, skipFrame: dropping ? 'noref' : 'default', skipLoopFilter: filter ? 'noref' : 'default',
        skipIdct: 'default', lowres: 0, filmGrain: omitGrain ? 'omit' : 'default', adaptiveState: dropping || filter && state === 'reduced-reconstruction' ? state : 'normal',
        shortcuts, ffmpegOptions,
        reason: dropping ? 'Sustained decoder pressure; non-reference pictures may be omitted' : filter ? 'Qualified non-reference deblocking shortcut' : omitGrain ? 'AV1 film-grain synthesis omitted' : input.decodeQuality === 'exact' ? 'Exact decoded output requested' : 'No qualified shortcut for this codec and quality',
        // mpv reads vd-lavc-o at decoder construction. A property assignment alone
        // must never be reported as an active live switch.
        requiresDecoderRestart: true };
}
export function mpvDecoderOptions(policy) {
    return Object.entries(policy.ffmpegOptions).map(([key, value]) => `${key}=${value}`).join(',');
}
/** Presentation drops alone can reflect display refresh limits rather than a
 * decoder backlog. Compare timeline progress with the requested playback rate. */
export function adaptiveDecodeSignal(input) {
    const expected = input.elapsedSeconds * input.playbackSpeed;
    const lagging = expected > 0 && input.advance < expected * .75;
    const synchronized = Math.abs(input.avsync) < .08;
    return {
        pressure: input.decoderDrops >= 2 || Math.abs(input.avsync) > .2 && (lagging || input.presentationDrops >= 2),
        recovered: input.decoderDrops === 0 && synchronized && expected > 0 && input.advance >= expected * .85,
    };
}
/** Sample every two seconds. Each transition is followed by mpv decoder
 * reinitialization, so demand sustained evidence and a long recovery window. */
export function nextAdaptiveState(state, codec, pressure, recovered, streak) {
    if (!supportsEmergencyFrameDrop(codec))
        return 'normal';
    if (pressure && streak >= 3) {
        if (state === 'normal')
            return ['h264', 'hevc'].includes(codec) ? 'reduced-reconstruction' : 'drop-non-reference';
        if (state === 'reduced-reconstruction')
            return 'drop-non-reference';
    }
    if (recovered && streak >= 5) {
        if (state === 'drop-non-reference')
            return ['h264', 'hevc'].includes(codec) ? 'reduced-reconstruction' : 'normal';
        if (state === 'reduced-reconstruction')
            return 'normal';
    }
    return state;
}
