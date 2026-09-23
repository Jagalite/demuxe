# SPDX-License-Identifier: Apache-2.0
"""Generate the planned catalogue from marked, original synthetic inputs."""
import json
from pathlib import Path


def generate(fixtures, run, duration):
    rows = json.loads((Path(__file__).parent / 'planned.json').read_text())['labels']
    assert len(rows) == 65
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
        ('hevc-pgs', 'mkv', 'hevc10', 'ac3'),
        ('h264-vobsub', 'mkv', 'copy', 'ac3'),
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
        ('hevc-truehd', None, None, None),
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
        ('mpeg2-video-only', 'ts', 'mpeg2video', None, 0),
        ('h264-ac3-stereo', 'mkv', 'copy', 'ac3'),
        ('h264-eac3-stereo', 'mkv', 'copy', 'eac3'),
        ('h264-dts-stereo', 'mkv', 'copy', 'dca'),
        ('h264-ac3-ass', 'mkv', 'copy', 'ac3'),
        ('h264-dual-audio', 'mkv', 'copy', 'dual-audio'),
        ('h264-high10', 'mkv', 'h264-high10', 'aac'),
        ('mpeg2-interlaced-ac3', 'ts', 'mpeg2-interlaced', 'ac3'),
        ('hevc422-aac', 'mkv', 'hevc422', 'aac'),
    ]
    blockers = {
        'hevc-truehd': 'Installed TrueHD encoder supports at most 5.1; 7.1 requires a validated external bitstream. See prepare-specialist-fixtures.py for separate basic screening.',
        'hevc-dtshd': 'Installed FFmpeg has DTS core encoding but no DTS-HD MA encoder; no licensed marked sample is available.',
        'hevc-atmos': 'Installed E-AC-3 encoder does not generate Atmos objects/metadata; no licensed marked sample is available.',
        'dv5': 'No Dolby Vision profile 5 encoder/marked sample and reference Dolby Vision output oracle are available.',
        'dv81': 'No Dolby Vision profile 8.1 metadata authoring/marked sample and reference output oracle are available.',
    }
    end_ms = round((duration - .2) * 1000)
    end = f'{end_ms // 3600000:02d}:{end_ms // 60000 % 60:02d}:{end_ms // 1000 % 60:02d}.{end_ms % 1000:03d}'
    (fixtures / 'captions.srt').write_text('1\n00:00:00,500 --> '+end.replace('.',',')+'\nDE MUXE TEST 123\n')
    (fixtures / 'captions.vtt').write_text('WEBVTT\n\n00:00:00.500 --> '+end+'\nDE MUXE TEST 123\n')
    from bitmap import write_pgs
    write_pgs(fixtures / 'captions.sup', duration)
    cache = {}
    def video_source(kind):
        if kind in (None, 'copy'):
            return fixtures / 'aac.mp4'
        if kind in cache:
            return cache[kind]
        target = fixtures / ('source-' + kind + '.mkv')
        opts = []
        if kind == 'h264-high10':
            opts = ['-c:v', 'libx264', '-profile:v', 'high10', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p10le', '-g', '30']
        elif kind == 'hevc422':
            opts = ['-c:v', 'libx265', '-profile:v', 'main422-10', '-preset', 'ultrafast', '-x265-params', 'pools=none:frame-threads=1:log-level=error:keyint=30', '-pix_fmt', 'yuv422p10le']
        elif kind == 'mpeg2-interlaced':
            pattern = (f"nullsrc=s=320x180:r=60:d={duration},"
                       "geq=lum='if(between(Y,70,100)*between(X,mod(T*40,240),mod(T*40,240)+40),235,16)':cb=128:cr=128,"
                       "drawbox=x=0:y=0:w=320:h=40:color=red:t=fill:enable='lt(t,4)',"
                       "drawbox=x=0:y=0:w=320:h=40:color=blue:t=fill:enable='gte(t,4)*lt(t,8)',"
                       "drawbox=x=0:y=0:w=320:h=40:color=green:t=fill:enable='gte(t,8)',"
                       "tinterlace=mode=interleave_top")
            run(['ffmpeg', '-nostdin', '-v', 'error', '-f', 'lavfi', '-i', pattern,
                 '-an', '-c:v', 'mpeg2video', '-flags:v', '+ilme+ildct', '-top', '1',
                 '-pix_fmt', 'yuv420p', '-g', '30', '-bf', '2', '-threads', '1', str(target)])
            cache[kind] = target
            return target
        elif kind.startswith('hevc') or kind in ('hdr10', 'hlg'):
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
            has_tone_input = channels > 0
            if has_tone_input:
                cmd += ['-f', 'lavfi', '-i', f'aevalsrc={tones}:s=48000:d={duration}:c={layout}']
            if key in ('hevc-pgs','h264-vobsub'):
                cmd += ['-fix_sub_duration', '-i', str(fixtures / 'captions.sup')]
                record.update(subtitleCheck='bitmap',embeddedSubtitle=True)
            if key in ('h264-srt', 'h264-movtext', 'h264-ass', 'h264-ac3-ass'):
                sub = 'captions.ass' if key == 'h264-ass' else 'captions.srt'
                if key == 'h264-ac3-ass': sub = 'captions.ass'
                cmd += ['-i', str(fixtures / sub)]
                record['subtitleCheck'] = 'ass' if key == 'h264-ass' else 'text'
                if key == 'h264-ac3-ass': record['subtitleCheck'] = 'ass'
                record['embeddedSubtitle'] = True
            if video:
                cmd += ['-map', '0:v:0', '-c:v', 'copy']
            if audio == 'dual-audio':
                cmd += ['-map', '0:a:0', '-c:a:0', 'copy', '-metadata:s:a:0', 'title=Marked AAC stereo',
                        '-disposition:a:0', 'default', '-map', '1:a:0', '-c:a:1', 'ac3', '-b:a:1', '192k',
                        '-metadata:s:a:1', 'title=Marked AC-3 stereo', '-disposition:a:1', '0']
                record.update(expectedAudioCodec='aac', audioTrackSwitches=['ac3','aac'])
            elif audio:
                if has_tone_input:
                    cmd += ['-map', '1:a:0']
                cmd += ['-c:a', audio, '-strict', '-2']
                if audio in ('aac','libopus','libmp3lame','vorbis'): cmd += ['-b:a', '384k' if channels > 2 else '192k']
                if audio == 'dca': cmd += ['-b:a', '768000' if channels == 2 else '1411200']
            if record.get('embeddedSubtitle'):
                subtitle_input = 2 if has_tone_input else 1
                cmd += ['-map', f'{subtitle_input}:s:0', '-c:s', 'dvdsub' if key == 'h264-vobsub' else 'mov_text' if key == 'h264-movtext' else 'copy', '-disposition:s:0', 'default']
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
            record['streams'] = [{k: stream.get(k) for k in ('codec_type','codec_name','profile','pix_fmt','channels','channel_layout','sample_rate','bits_per_raw_sample','field_order','width','height','r_frame_rate','color_transfer')} for stream in probe['streams']]
            if key == 'h264-high10':
                v = next(s for s in record['streams'] if s['codec_type'] == 'video')
                assert v['codec_name'] == 'h264' and v['profile'] == 'High 10' and v['pix_fmt'] == 'yuv420p10le', 'H.264 High 10 profile/pixel format mismatch'
            if key == 'hevc422-aac':
                v = next(s for s in record['streams'] if s['codec_type'] == 'video')
                assert v['codec_name'] == 'hevc' and v['pix_fmt'] == 'yuv422p10le', 'HEVC 4:2:2 10-bit pixel format mismatch'
                assert v['profile'] in ('Rext', 'Main 4:2:2 10'), 'HEVC range-extension profile mismatch: ' + str(v['profile'])
                record['profileVerification'] = {'codec': v['codec_name'], 'profile': v['profile'], 'pixelFormat': v['pix_fmt']}
            if key == 'mpeg2-interlaced-ac3':
                v = next(s for s in record['streams'] if s['codec_type'] == 'video')
                assert v['codec_name'] == 'mpeg2video' and v['field_order'] in ('tt','tb'), 'Interlaced MPEG-2 field order missing: ' + str(v['field_order'])
                frames = json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-read_intervals','%+#12','-show_entries','frame=interlaced_frame,top_field_first','-of','json',str(target)]))['frames']
                assert any(frame.get('interlaced_frame') == 1 for frame in frames), 'Encoded MPEG-2 frames are not marked interlaced'
                record['interlacedFrameOracle'] = frames
            if key == 'mpeg2-video-only':
                record['videoPacketHash'] = run(['ffmpeg','-nostdin','-v','error','-i',str(target),'-map','0:v:0','-c','copy','-f','hash','-hash','sha256','-'])
            if key == 'h264-vobsub':
                assert float(probe['format']['duration']) < duration+1, 'Unbounded bitmap subtitle duration'
            if channels > 2:
                assert any(s.get('channels') == channels for s in probe['streams']), 'Generated channel count mismatch'
                record['qualificationLimit'] = 'Multichannel encoded input screened through stereo output; discrete channel fidelity remains unqualified.'
            if key in ('hdr10-hevc','hlg-hevc','hdr10-av1'):
                record['qualificationLimit'] = 'Tagged 10-bit HDR decode/lifecycle screen only; reference HDR transfer, tone mapping and physical display fidelity remain unqualified.'
            if key in ('mpeg2-video-only','mpeg2-interlaced-ac3','h264-high10','hevc422-aac'):
                record['qualificationLimit'] = 'Deterministic synthetic 320x180 marked output; bounded route/decode/lifecycle screen, not reference media fidelity or high-resolution performance qualification.'
        except Exception as error:
            record['blockedReason'] = 'Fixture preparation failed: ' + str(error)
        print(key, record.get('blockedReason', 'prepared'), flush=True)
    aac_probe = json.loads((fixtures / 'aac.mkv.probe.json').read_text())
    catalogue['h264-aac-control'] = {
        'label': 'H.264 + AAC stereo reference / MKV', 'video': True, 'audio': True, 'channels': 2,
        'file': 'aac.mkv',
        'streams': [{k: s.get(k) for k in ('codec_type','codec_name','profile','pix_fmt','channels','channel_layout','sample_rate','bits_per_raw_sample','field_order','width','height','r_frame_rate','color_transfer')} for s in aac_probe['streams']],
        'expectedAudioCodec': 'aac',
        'qualificationLimit': 'Existing marked H.264/AAC fixture used as a same-snapshot route control for the dual-audio selection case.'}
    dual = catalogue['h264-dual-audio']
    catalogue['h264-dual-audio-ac3-selected'] = {**dual,
        'label': 'Dual-audio H.264 + AAC + AC-3 stereo / MKV (AC-3 selected)',
        'selectAudioCodec': 'ac3', 'expectedAudioCodec': 'ac3', 'audioTrackSwitches': []}
    (fixtures / 'catalogue.json').write_text(json.dumps(catalogue, indent=2) + '\n')
    return catalogue
