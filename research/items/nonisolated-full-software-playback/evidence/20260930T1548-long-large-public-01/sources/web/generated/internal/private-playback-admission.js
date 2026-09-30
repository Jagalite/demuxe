// SPDX-License-Identifier: Apache-2.0
export function privatePlaybackAssets(value, runtime) {
    if (!value || typeof value !== 'object')
        return;
    const v = value;
    if (v.schema !== 1 || v.backend !== runtime || v.profile !== 'playback' || !['playback', 'playback-full'].includes(String(v.codecProfile)) || typeof v.retainedDecoder !== 'boolean' || !Array.isArray(v.decoders) || !v.decoders.length || v.decoders.some(d => typeof d !== 'string' || !/^[a-z0-9_]+$/.test(d)))
        return;
    return { codecProfile: v.codecProfile, retainedDecoder: v.retainedDecoder, decoders: [...v.decoders] };
}
/** Admission matches the installed playback codec profile and tested workload. */
export function privatePlaybackRejection(probe, source, features, assets, mode = 'software') {
    const extended = assets?.codecProfile === 'playback-full';
    if (!source.finite)
        return 'Private Software requires a finite random-access file';
    if (!probe)
        return 'Private Software requires source inspection';
    if (!Number.isSafeInteger(source.bytes) || source.bytes <= 0 || (!extended && source.bytes > 64 * 1024 * 1024))
        return 'Private Software requires a source within 64 MiB';
    if (!Number.isFinite(probe.duration) || probe.duration <= 0 || (!extended && probe.duration > 60))
        return 'Private Software currently requires a duration within 60 seconds';
    const videos = probe.tracks.filter(t => t.type === 'video' && !t.attachedPicture), audio = probe.tracks.filter(t => t.type === 'audio');
    const codecs = mode === 'hybrid' ? ['h264', 'hevc', 'vp8', 'vp9', 'av1'] : extended ? ['mpeg2video', 'mpeg4', 'prores', 'h264', 'hevc', 'vp8', 'vp9', 'av1'] : ['mpeg2video', 'mpeg4', 'prores'];
    if (mode === 'hybrid' && !assets?.retainedDecoder)
        return 'Private Hybrid requires retained decoder assets';
    if (videos.length !== 1 || !codecs.includes(videos[0].codec))
        return 'Video codec is outside the private Software playback profile';
    if (!videos[0].width || !videos[0].height || videos[0].width > 1920 || videos[0].height > 1080)
        return 'Private Software decode dimensions exceed 1920x1080';
    if (mode === 'software' && assets && !assets.decoders.includes(videos[0].codec === 'av1' ? 'libdav1d' : videos[0].codec))
        return 'Installed private playback video decoder is unavailable';
    const audioCodecs = extended ? ['ac3', 'mp2', 'mp3', 'pcm_s16le', 'vorbis', 'opus', 'flac', 'aac', 'eac3', 'dts', 'truehd', 'alac', 'pcm_s24le'] : ['ac3', 'mp2', 'mp3', 'pcm_s16le'];
    if (assets && audio.some(t => !assets.decoders.includes(t.codec === 'dts' ? 'dca' : t.codec) && !(t.codec === 'mp3' && assets.decoders.includes('mp3float'))))
        return 'Installed private playback audio decoder is unavailable';
    if (audio.length > 1 || audio.some(t => !audioCodecs.includes(t.codec) || t.channels !== 2 || t.sampleRate !== 48000))
        return 'Private playback requires at most one installed 48 kHz stereo audio track';
    if (features.vf || features.af || features.toneMapping !== 'off')
        return 'Private Software filters and tone mapping are not qualified';
    if (features.audioOutput !== 'stereo' || features.gain > 1 || features.speed < 0.5 || features.speed > 2)
        return 'Requested audio layout, gain or rate is outside the private Software profile';
    if (features.externalSubtitles || features.customFonts || features.subtitleStyle || probe.tracks.some(t => t.type === 'sub'))
        return 'Private Software subtitle and font features are not qualified';
}
