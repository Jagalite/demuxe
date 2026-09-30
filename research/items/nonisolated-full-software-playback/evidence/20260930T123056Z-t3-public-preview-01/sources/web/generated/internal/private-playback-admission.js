/** Admission matches the installed playback codec profile and tested workload. */
export function privatePlaybackRejection(probe, source, features) {
    if (!source.finite)
        return 'Private Software requires a finite random-access file';
    if (!probe)
        return 'Private Software requires source inspection';
    if (!Number.isFinite(source.bytes) || source.bytes <= 0 || source.bytes > 64 * 1024 * 1024)
        return 'Private Software requires a source within 64 MiB';
    if (!Number.isFinite(probe.duration) || probe.duration <= 0 || probe.duration > 60)
        return 'Private Software currently requires a duration within 60 seconds';
    const videos = probe.tracks.filter(t => t.type === 'video' && !t.attachedPicture), audio = probe.tracks.filter(t => t.type === 'audio');
    if (videos.length !== 1 || !['mpeg2video', 'mpeg4', 'prores'].includes(videos[0].codec))
        return 'Video codec is outside the private Software playback profile';
    if (!videos[0].width || !videos[0].height || videos[0].width > 1920 || videos[0].height > 1080)
        return 'Private Software decode dimensions exceed 1920x1080';
    if (audio.length > 1 || audio.some(t => !['ac3', 'mp2', 'mp3', 'pcm_s16le'].includes(t.codec) || t.channels !== 2 || t.sampleRate !== 48000))
        return 'Private Software currently requires at most one 48 kHz stereo AC-3, MP2, MP3 or PCM16 track';
    if (features.vf || features.af || features.toneMapping !== 'off')
        return 'Private Software filters and tone mapping are not qualified';
    if (features.audioOutput !== 'stereo' || features.gain > 1 || features.speed < 0.5 || features.speed > 2)
        return 'Requested audio layout, gain or rate is outside the private Software profile';
    if (features.externalSubtitles || features.customFonts || features.subtitleStyle || probe.tracks.some(t => t.type === 'sub'))
        return 'Private Software subtitle and font features are not qualified';
}
