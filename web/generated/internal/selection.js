// SPDX-License-Identifier: Apache-2.0
/** Narrow file-only automatic FLAC admission. Unknown or unequal ends are rejected.
 * The runtime still verifies packets, samples, actual MSE output and work bounds. */
export function losslessAdaptationRejection(probe, settings) {
    if (!probe.format?.includes('matroska'))
        return 'Automatic FLAC requires inspected Matroska';
    const selected = (type, id = 'auto') => { const tracks = probe.tracks.filter(t => t.type === type && !t.attachedPicture); return id === 'no' ? undefined : id === 'auto' ? (tracks.find(t => t.default) || tracks[0]) : tracks.find(t => t.id === id); };
    if (settings.subtitles && selected('sub', settings.sid))
        return 'Embedded subtitles require mpv rendering';
    const v = selected('video'), a = selected('audio', settings.aid);
    if (!v || v.codec !== 'h264' || !v.width || !v.height || v.width * v.height > 1920 * 1080)
        return 'Automatic FLAC requires H264 up to 1080p';
    if (!a || !['pcm_s16le', 'pcm_s24le'].includes(a.codec) || a.sampleRate !== 48000 || ![1, 2].includes(a.channels ?? 0) || ![16, 24].includes(a.bits ?? 0))
        return 'Automatic FLAC requires selected 48 kHz mono/stereo PCM16/24';
    if ([v, a].some(t => !Number.isFinite(t.startTime) || t.startTime < 0 || !Number.isFinite(t.endTime) || t.endTime <= t.startTime))
        return 'Automatic FLAC requires known selected-track bounds';
    if (Math.abs(v.startTime - a.startTime) > .05 || Math.abs(v.endTime - a.endTime) > .05)
        return 'Automatic FLAC selected-track offsets or tails exceed qualification';
    if (!Number.isFinite(probe.duration) || probe.duration <= 0)
        return 'Automatic FLAC requires a finite duration';
}
/** A simple browser-supported HLS VOD may avoid a JS streaming engine. All
 * controlled adaptive behavior belongs to Shaka, then eligible mpv fallback.
 * A browser hint admits a trial; actual output is verified separately. */
export function nativeManifestRejection(source, settings, browserNativeHLS = false) {
    if (source.demuxer || source.format !== 'hls')
        return 'Adaptive manifest execution requires Shaka';
    if (source.streaming?.live)
        return 'Live/DVR execution requires Shaka';
    if (source.streaming?.maxBandwidth !== undefined || source.streaming?.representation !== undefined)
        return 'Controlled adaptive quality requires Shaka';
    if (!['auto', 'no'].includes(settings.aid) || (settings.subtitles && !['auto', 'no'].includes(settings.sid)))
        return 'Explicit manifest track selection requires a controlled backend';
    if (!browserNativeHLS)
        return 'Browser does not advertise direct HLS playback; use Shaka/MSE';
}
export function nativeRejection(probe, settings, _video) {
    const selected = (type, id = 'auto') => { const tracks = probe.tracks.filter(t => t.type === type && !t.attachedPicture); return id === 'no' ? undefined : id === 'auto' ? (tracks.find(t => t.default) || tracks[0]) : tracks.find(t => t.id === id); };
    // Browser text-track exposure cannot reliably prove embedded subtitle delivery.
    if (settings.subtitles && selected('sub', settings.sid))
        return 'Embedded subtitles require mpv rendering';
    const v = selected('video'), a = selected('audio', settings.aid);
    if (!['auto', 'no'].includes(settings.aid) && !a)
        return 'Requested audio track was not found';
    if (!v && !a)
        return 'No selected playable streams';
    // Codec configuration knowledge belongs to preparation, not direct browser admission.
    // Unknown mappings and canPlayType() answers cannot reject unchanged source bytes.
}
/** These are Demuxe's packet-construction contracts, not browser support.
 * An absent contract excludes preparation only; direct playback stays testable. */
export function remuxRejection(probe, settings) {
    const video = probe.tracks.find(t => t.type === 'video' && !t.attachedPicture);
    const audioTracks = probe.tracks.filter(t => t.type === 'audio');
    const audio = settings.aid === 'no' ? undefined : settings.aid === 'auto' ? (audioTracks.find(t => t.default) ?? audioTracks[0]) : audioTracks.find(t => t.id === settings.aid);
    if (probe.format?.split(',').includes('mpegts') && (!video || video.codec !== 'h264' || (audio && audio.codec !== 'aac')))
        return 'Demuxe TS timestamp-repair construction requires H264 with optional AAC audio';
    if (video && !['h264', 'hevc', 'vp8', 'vp9', 'av1'].includes(video.codec))
        return `Demuxe has no packet-copy video construction contract for ${video.codec}`;
    if (audio && !['aac', 'mp3', 'opus', 'vorbis', 'flac', 'ac3', 'eac3'].includes(audio.codec))
        return `Demuxe has no packet-copy audio construction contract for ${audio.codec}`;
    if ((video?.codec === 'vp8' && audio && !['opus', 'vorbis'].includes(audio.codec)) || (audio?.codec === 'vorbis' && video && !['vp8', 'vp9', 'av1'].includes(video.codec)))
        return 'Selected packets have no common Demuxe muxing contract';
}
