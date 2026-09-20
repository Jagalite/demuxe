# SPDX-License-Identifier: Apache-2.0
"""Generate the planned catalogue from marked, original synthetic inputs."""
import json
from pathlib import Path


def generate(fixtures, run, duration):
    rows = [line.split('|')[1].strip() for line in (Path(__file__).parents[2] / 'docs/HEAD-TO-HEAD-ROUTES.md').read_text().splitlines() if '| Planned |' in line]
    assert len(rows) == 56
    definitions = [
        ('h264-aac51', 'mp4', 'copy', 'aac', 6),
        ('h264-mp3', 'mp4', 'copy', 'libmp3lame'),
        ('h264-ac3', 'mkv', 'copy', 'ac3', 6),
        ('h264-eac3', 'mkv', 'copy', 'eac3', 6),
        ('h264-dts', 'mkv', 'copy', 'dca', 6),
        ('h264-flac', 'mkv', 'copy', 'flac'),
        ('h264-flac51', 'mkv', 'copy', 'flac', 6),
        ('h264-opus', 'mkv', 'copy', 'libopus'),
        ('h264-pcm16', 'mkv', 'copy', 'pcm_s16le'),
        ('h264-pcm51', 'mkv', 'copy', 'pcm_s24le', 6),
        ('hevc-hvc1', 'mp4', 'hevc8', 'aac'),
        ('hevc-hev1', 'mp4', 'hevc8', 'aac'),
        ('hevc10-aac', 'mp4', 'hevc10', 'aac'),
        ('hevc10-ac3', 'mkv', 'hevc10', 'ac3'),
        ('hevc10-eac3', 'mkv', 'hevc10', 'eac3'),
        ('hevc10-dts', 'mkv', 'hevc10', 'dca'),
        ('av1-aac', 'mp4', 'av1', 'aac'),
        ('av110-opus', 'mkv', 'av110', 'libopus'),
        ('av1-webm', 'webm', 'av1', 'libopus'),
        ('vp9-opus', 'webm', 'vp9', 'libopus'),
        ('vp910-opus', 'webm', 'vp910', 'libopus'),
        ('vp8-vorbis', 'webm', 'vp8', 'vorbis'),
        ('h264-ts', 'ts', 'copy', 'aac'),
        ('mpeg2-ac3', 'ts', 'mpeg2video', 'ac3'),
        ('mpeg2-mp2', 'mpg', 'mpeg2video', 'mp2'),
        ('mpeg4-mp3', 'avi', 'mpeg4', 'libmp3lame'),
        ('prores-pcm', 'mov', 'prores_ks', 'pcm_s16le'),
        ('h264-fmp4', 'mp4', 'copy', 'aac'),
        ('h264-silent', 'mp4', 'copy', None),
        ('h264-srt', 'mkv', 'copy', 'aac'),
        ('h264-vtt', 'mp4', 'copy', 'aac'),
        ('h264-movtext', 'mp4', 'copy', 'aac'),
        ('h264-ass', 'mkv', 'copy', 'aac'),
        ('hevc-pgs', None, None, None),
        ('h264-vobsub', None, None, None),
        ('audio-aac', 'm4a', None, 'aac'),
        ('audio-mp3', 'mp3', None, 'libmp3lame'),
        ('audio-flac', 'flac', None, 'flac'),
        ('audio-opus', 'ogg', None, 'libopus'),
        ('audio-vorbis', 'ogg', None, 'vorbis'),
        ('audio-pcm16', 'wav', None, 'pcm_s16le'),
        ('audio-pcm24', 'wav', None, 'pcm_s24le'),
        ('hdr10-hevc', 'mkv', 'hdr10', 'eac3'),
        ('hlg-hevc', 'mp4', 'hlg', 'aac'),
        ('hdr10-av1', 'webm', 'av1hdr', 'libopus'),
        ('hevc-truehd', 'mkv', 'hevc10', 'truehd', 8),
        ('hevc-dtshd', None, None, None),
        ('hevc-atmos', None, None, None),
        ('dv5', None, None, None),
        ('dv81', None, None, None),
        ('hls-ts', 'm3u8', 'copy', 'aac'),
        ('hls-fmp4', 'm3u8', 'copy', 'aac'),
        ('hls-hevc', 'm3u8', 'hevc8', 'aac'),
        ('dash-h264', 'mpd', 'copy', 'aac'),
        ('dash-av1', 'mpd', 'av1', 'libopus'),
        ('hls-live', 'm3u8', 'copy', 'aac'),
    ]
    blockers = {
        'hevc-pgs': 'No original PGS bitmap fixture/encoder and corresponding bitmap oracle are available.',
        'h264-vobsub': 'No original VobSub bitmap fixture and corresponding bitmap oracle are available.',
        'hevc-dtshd': 'Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available.',
        'hevc-atmos': 'Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available.',
        'dv5': 'No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available.',
        'dv81': 'No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available.',
    }
    (fixtures / 'captions.srt').write_text('1\n00:00:00,500 --> 00:00:35,800\nDE MUXE TEST 123\n')
    (fixtures / 'captions.vtt').write_text('WEBVTT\n\n00:00.500 --> 00:35.800\nDE MUXE TEST 123\n')
    cache = {}
    def video_source(kind):
        if kind in (None, 'copy'):
            return fixtures / 'aac.mp4'
        if kind in cache:
            return cache[kind]
        target = fixtures / ('source-' + kind + '.mkv')
        opts = []
        if kind.startswith('hevc') or kind in ('hdr10', 'hlg'):
            opts = ['-c:v', 'libx265', '-preset', 'ultrafast', '-x265-params', 'pools=none:frame-threads=1:log-level=error:keyint=30', '-pix_fmt', 'yuv420p' if kind == 'hevc8' else 'yuv420p10le']
        elif kind.startswith('av1'):
            opts = ['-c:v', 'libsvtav1', '-preset', '12', '-svtav1-params', 'lp=1', '-g', '30', '-pix_fmt', 'yuv420p' if kind == 'av1' else 'yuv420p10le']
        elif kind.startswith('vp9') or kind == 'vp8':
            opts = ['-c:v', 'libvpx' if kind == 'vp8' else 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-g', '30', '-pix_fmt', 'yuv420p10le' if kind == 'vp910' else 'yuv420p']
        else:
            opts = ['-c:v', kind, '-pix_fmt', 'yuv422p10le' if kind == 'prores_ks' else 'yuv420p', '-g', '30']
        if kind in ('hdr10', 'hlg', 'av1hdr'):
            # This is only a tagged HDR decode screen, not reference HDR color fidelity.
            opts += ['-color_primaries', 'bt2020', '-colorspace', 'bt2020nc', '-color_trc', 'arib-std-b67' if kind == 'hlg' else 'smpte2084']
        run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(fixtures / 'aac.mp4'), '-an', *opts, '-threads', '1', str(target)])
        cache[kind] = target
        return target
    catalogue = {}
    for label, entry in zip(rows, definitions):
        key, ext, video, audio, *channel_arg = entry
        channels = channel_arg[0] if channel_arg else 2
        record = {'label': label, 'video': video is not None, 'audio': audio is not None, 'channels': channels}
        catalogue[key] = record
        if key in blockers:
            record['blockedReason'] = blockers[key]
            continue
        try:
            src = video_source(video)
            outdir = fixtures / key
            outdir.mkdir()
            target = outdir / ('index.' + ext)
            record['file'] = str(target.relative_to(fixtures))
            cmd = ['ffmpeg', '-nostdin', '-v', 'error', '-i', str(src)]
            tones = '|'.join(f'{0.15 if i<2 else 0.025}*sin(2*PI*{freq}*t)' for i,freq in enumerate([440,880] if channels == 2 else [440,880,1320,80,1760,2200,2640,3080][:channels]))
            layout = 'stereo' if channels == 2 else '5.1' if channels == 6 else '7.1'
            cmd += ['-f', 'lavfi', '-i', f'aevalsrc={tones}:s=48000:d={duration}:c={layout}']
            if key in ('h264-srt', 'h264-movtext', 'h264-ass'):
                sub = 'captions.ass' if key == 'h264-ass' else 'captions.srt'
                cmd += ['-i', str(fixtures / sub)]
                record['subtitleCheck'] = 'ass' if key == 'h264-ass' else 'text'
                record['embeddedSubtitle'] = True
            if video:
                cmd += ['-map', '0:v:0', '-c:v', 'copy']
            if audio:
                cmd += ['-map', '1:a:0', '-c:a', audio, '-strict', '-2']
                if audio in ('aac','libopus','libmp3lame','vorbis'): cmd += ['-b:a', '384k' if channels > 2 else '192k']
                if audio == 'dca': cmd += ['-b:a', '1411200']
            if record.get('embeddedSubtitle'):
                cmd += ['-map', '2:s:0', '-c:s', 'mov_text' if key == 'h264-movtext' else 'copy', '-disposition:s:0', 'default']
            if key == 'h264-vtt':
                record.update(subtitle='captions.vtt', subtitleCheck='text')
            if key.startswith('hevc') and ext == 'mp4' or key in ('hlg-hevc','hls-hevc'):
                cmd += ['-tag:v', 'hev1' if key == 'hevc-hev1' else 'hvc1']
            if ext in ('mp4','m4a','mov'):
                cmd += ['-movflags', '+frag_keyframe+empty_moov+default_base_moof' if key == 'h264-fmp4' else '+faststart']
            if ext == 'm3u8':
                cmd += ['-f', 'hls', '-hls_time', '2', '-hls_list_size', '0', '-hls_playlist_type', 'vod']
                if key != 'hls-ts' and key != 'hls-live': cmd += ['-hls_segment_type', 'fmp4']
                record['streamFormat'] = 'hls'
                if key == 'hls-live': record['live'] = True
            if ext == 'mpd':
                cmd += ['-f', 'dash', '-seg_duration', '2', '-use_template', '1', '-use_timeline', '1']
                record['streamFormat'] = 'dash'
                if key == 'dash-av1': cmd += ['-dash_segment_type','webm']
            if ext in ('ts', 'mpg'): cmd += ['-muxdelay','0','-muxpreload','0']
            cmd += ['-threads','1', str(target)]
            run(cmd)
            if ext == 'mpd':
                # Host FFmpeg build may omit DASH demuxing. Probe each authored representation directly.
                probe = {'streams': [], 'scope': 'DASH initialization plus first media segment per representation'}
                for init in sorted(outdir.glob('init-stream*')):
                    representation = init.stem.split('init-stream')[1]
                    chunk = sorted(outdir.glob('chunk-stream' + representation + '-*'))[0]
                    source = 'concat:' + str(init) + '|' + str(chunk)
                    probe['streams'] += json.loads(run(['ffprobe','-v','error','-show_streams','-of','json',source]))['streams']
            else:
                probe = json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]))
            (outdir / 'probe.json').write_text(json.dumps(probe, indent=2) + '\n')
            record['streams'] = [{k: stream.get(k) for k in ('codec_type','codec_name','profile','pix_fmt','channels','channel_layout','color_transfer')} for stream in probe['streams']]
            if channels > 2:
                assert any(s.get('channels') == channels for s in probe['streams']), 'Generated channel count mismatch'
                record['qualificationLimit'] = 'Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.'
            if key in ('hdr10-hevc','hlg-hevc','hdr10-av1'):
                record['qualificationLimit'] = 'Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified.'
        except Exception as error:
            record['blockedReason'] = 'Fixture preparation failed: ' + str(error)
        print(key, record.get('blockedReason', 'prepared'), flush=True)
    (fixtures / 'catalogue.json').write_text(json.dumps(catalogue, indent=2) + '\n')
    return catalogue
