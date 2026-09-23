#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Extend a fresh setup.py snapshot with five deterministic real-resolution cases."""

import argparse
import hashlib
import json
import shutil
import subprocess
from fractions import Fraction
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def write_pgs(path, duration):
    """Original marked 4K PGS, scaled from this harness's bitmap.py oracle."""
    be = lambda number, size: number.to_bytes(size, 'big')
    width, height, x, y, box_width, box_height = 3840, 2160, 3000, 1720, 300, 160

    def segment(pts, kind, body):
        return b'PG' + be(pts, 4) + be(pts, 4) + bytes([kind]) + be(len(body), 2) + body

    def composition(number, count):
        head = be(width, 2) + be(height, 2) + bytes([0x10]) + be(number, 2) + bytes([0x80 if number == 0 else 0, 0, 0, count])
        return head + (be(0, 2) + bytes([0, 0]) + be(x, 2) + be(y, 2) if count else b'')

    rle = (bytes([1]) * box_width + bytes([0, 0])) * box_height
    obj = be(0, 2) + bytes([0, 0xc0]) + be(len(rle) + 4, 3) + be(box_width, 2) + be(box_height, 2) + rle
    palette = bytes([0, 0, 0, 16, 128, 128, 0, 1, 106, 222, 202, 255])
    window = bytes([1, 0]) + be(0, 2) + be(0, 2) + be(width, 2) + be(height, 2)
    entries = [(45000, 0x16, composition(0, 1)), (45000, 0x17, window), (45000, 0x14, palette),
               (45000, 0x15, obj), (45000, 0x80, b''),
               (round((duration - .2) * 90000), 0x16, composition(1, 0)),
               (round((duration - .2) * 90000), 0x80, b'')]
    path.write_bytes(b''.join(segment(*entry) for entry in entries))


def pattern(width, height, fps, duration):
    top = "drawbox=x=0:y=0:w=iw:h=ih*0.15:color={}:t=fill:enable='{}'"
    return ','.join([
        f'testsrc2=size={width}x{height}:rate={fps}:duration={duration}',
        top.format('red', 'lt(t,4)'),
        top.format('blue', 'gte(t,4)*lt(t,8)'),
        top.format('green', 'gte(t,8)'),
        'drawbox=x=iw*0.63:y=ih*0.68:w=iw*0.37:h=ih*0.27:color=black:t=fill',
    ])


def prepare(assets, engine_parent):
    assets = assets.resolve()
    fixtures = assets / 'fixtures'
    assert fixtures.is_dir() and (assets / 'manifest.json').is_file(), 'Run setup.py first'
    assert not (fixtures / 'catalogue.json').exists(), 'This snapshot was already extended'
    duration = json.loads((assets / 'manifest.json').read_text())['fixture']['duration']
    assert duration >= 35, 'At least 35 seconds are needed for the standard CPU window'
    sources = fixtures / '_real_resolution_sources'
    sources.mkdir(exist_ok=True)
    commands = json.loads((assets / 'commands.json').read_text())

    def run(argv):
        if argv[0] == 'ffmpeg' and '-y' in argv and Path(argv[-1]).is_file():
            if any(entry['argv'] == argv and entry['exit'] == 0 for entry in commands):
                return ''  # Resume a completed encode without changing its bytes.
        result = subprocess.run(argv, capture_output=True, text=True)
        commands.append({'argv': argv, 'cwd': str(Path.cwd()), 'exit': result.returncode,
                         'stdout': result.stdout, 'stderr': result.stderr})
        (assets / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
        if result.returncode:
            raise RuntimeError(f'{argv[0]} failed; inspect {assets / "commands.json"}: {result.stderr[-500:]}')
        return result.stdout

    ff = ['ffmpeg', '-nostdin', '-v', 'error', '-y']
    tone = f'aevalsrc=0.15*sin(2*PI*440*t)|0.15*sin(2*PI*880*t):s=48000:d={duration}:c=stereo'
    h264 = sources / 'h264-1080p60.mkv'
    hevc = sources / 'hevc-main10-4k24.mkv'
    av1 = sources / 'av1-4k24.mkv'
    run(ff + ['-f', 'lavfi', '-i', pattern(1920, 1080, 60, duration), '-an',
              '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryfast', '-crf', '18',
              '-pix_fmt', 'yuv420p', '-threads', '4', '-g', '120', str(h264)])
    run(ff + ['-f', 'lavfi', '-i', pattern(3840, 2160, 24, duration), '-an',
              '-c:v', 'libx265', '-profile:v', 'main10', '-preset', 'ultrafast', '-crf', '22',
              '-pix_fmt', 'yuv420p10le', '-x265-params', 'pools=4:frame-threads=2:log-level=error:keyint=48',
              str(hevc)])
    run(ff + ['-f', 'lavfi', '-i', pattern(3840, 2160, 24, duration), '-an',
              '-c:v', 'libsvtav1', '-preset', '13', '-crf', '25', '-pix_fmt', 'yuv420p',
              '-svtav1-params', 'lp=4', '-g', '48', str(av1)])

    pgs = sources / 'marked-4k.sup'
    write_pgs(pgs, duration)
    outputs = {
        'rr-h264-1080p60-aac': ('h264-1080p60-aac.mp4', 1920, 1080, 60, True, None),
        'rr-hevc-4k24-aac': ('hevc-main10-4k24-aac.mkv', 3840, 2160, 24, True, None),
        'rr-hevc-4k24-truehd-pgs': ('hevc-main10-4k24-truehd-pgs.mkv', 3840, 2160, 24, True, 'bitmap'),
        'rr-av1-4k24-opus': ('av1-4k24-opus.mkv', 3840, 2160, 24, True, None),
        'rr-prores-1080p30-video': ('prores-proxy-1080p30.mov', 1920, 1080, 30, False, None),
    }
    run(ff + ['-i', str(h264), '-f', 'lavfi', '-i', tone, '-map', '0:v:0', '-map', '1:a:0',
              '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-metadata:s:a:0', 'title=Marked AAC stereo',
              '-movflags', '+faststart', str(fixtures / outputs['rr-h264-1080p60-aac'][0])])
    run(ff + ['-i', str(hevc), '-f', 'lavfi', '-i', tone, '-map', '0:v:0', '-map', '1:a:0',
              '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-metadata:s:a:0', 'title=Marked AAC stereo',
              str(fixtures / outputs['rr-hevc-4k24-aac'][0])])
    run(ff + ['-i', str(hevc), '-f', 'lavfi', '-i', tone, '-fix_sub_duration', '-i', str(pgs),
              '-map', '0:v:0', '-map', '1:a:0', '-map', '2:s:0', '-c:v', 'copy', '-c:a', 'truehd',
              '-strict', '-2', '-c:s', 'copy', '-metadata:s:a:0', 'title=Marked TrueHD stereo',
              '-metadata:s:s:0', 'title=Marked PGS', '-disposition:s:0', 'default',
              str(fixtures / outputs['rr-hevc-4k24-truehd-pgs'][0])])
    run(ff + ['-i', str(av1), '-f', 'lavfi', '-i', tone, '-map', '0:v:0', '-map', '1:a:0',
              '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '192k', '-vbr', 'off',
              '-metadata:s:a:0', 'title=Marked Opus stereo', str(fixtures / outputs['rr-av1-4k24-opus'][0])])
    run(ff + ['-f', 'lavfi', '-i', pattern(1920, 1080, 30, duration), '-an',
              '-c:v', 'prores_ks', '-profile:v', '0', '-qscale:v', '18', '-pix_fmt', 'yuv422p10le',
              '-threads', '4', str(fixtures / outputs['rr-prores-1080p30-video'][0])])

    labels = {
        'rr-h264-1080p60-aac': '1080p60 H.264 + AAC / MP4',
        'rr-hevc-4k24-aac': '4K24 HEVC Main10 + AAC / MKV',
        'rr-hevc-4k24-truehd-pgs': '4K24 HEVC Main10 + TrueHD + PGS / MKV',
        'rr-av1-4k24-opus': '4K24 AV1 + Opus / MKV',
        'rr-prores-1080p30-video': '1080p30 ProRes Proxy video-only / MOV',
    }
    expected = {
        'rr-h264-1080p60-aac': ('h264', 'High', 'yuv420p', 'aac'),
        'rr-hevc-4k24-aac': ('hevc', 'Main 10', 'yuv420p10le', 'aac'),
        'rr-hevc-4k24-truehd-pgs': ('hevc', 'Main 10', 'yuv420p10le', 'truehd'),
        'rr-av1-4k24-opus': ('av1', 'Main', 'yuv420p', 'opus'),
        'rr-prores-1080p30-video': ('prores', None, 'yuv422p10le', None),
    }
    catalogue = {}
    for key, (filename, width, height, fps, has_audio, subtitle_check) in outputs.items():
        target = fixtures / filename
        probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(target)]))
        streams = probe['streams']
        video = next(s for s in streams if s['codec_type'] == 'video')
        codec, profile, pixel, audio_codec = expected[key]
        assert (video['codec_name'], video['pix_fmt']) == (codec, pixel), (key, video)
        assert profile is None or video['profile'] == profile, (key, video['profile'])
        assert (video['width'], video['height']) == (width, height), key
        assert video['r_frame_rate'] == f'{fps}/1' and abs(float(Fraction(video['avg_frame_rate'])) - fps) < .02, (key, video['r_frame_rate'], video['avg_frame_rate'])
        audio = next((s for s in streams if s['codec_type'] == 'audio'), None)
        assert (audio is not None) == has_audio, key
        if has_audio:
            assert audio['codec_name'] == audio_codec and audio['channels'] == 2, (key, audio)
        subtitles = [s for s in streams if s['codec_type'] == 'subtitle']
        assert [s['codec_name'] for s in subtitles] == (['hdmv_pgs_subtitle'] if subtitle_check else []), key
        packet_lines = run(['ffprobe', '-v', 'error', '-show_packets', '-show_entries', 'packet=stream_index,size',
                            '-of', 'csv=p=0', str(target)]).splitlines()
        sizes = {}
        for line in packet_lines:
            fields = line.strip().split(',')
            if len(fields) >= 2 and fields[0].isdigit() and fields[1].isdigit():
                sizes[int(fields[0])] = sizes.get(int(fields[0]), 0) + int(fields[1])
        seconds = float(probe['format']['duration'])
        packet_hash = run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(target), '-map', '0:v:0',
                           '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).strip()
        record = {'label': labels[key], 'file': filename, 'video': True, 'audio': has_audio,
                  'channels': 2 if has_audio else 0, 'width': width, 'height': height,
                  'frameRate': fps, 'subtitleCheck': subtitle_check, 'embeddedSubtitle': bool(subtitle_check),
                  'expectedAudioCodec': audio_codec, 'sha256': sha256(target), 'videoPacketHash': packet_hash,
                  'durationSeconds': seconds, 'containerBitrate': round(8 * target.stat().st_size / seconds),
                  'streams': [{k: s.get(k) for k in ('index', 'codec_type', 'codec_name', 'profile', 'pix_fmt',
                              'width', 'height', 'r_frame_rate', 'avg_frame_rate', 'channels', 'channel_layout', 'sample_rate',
                              'bit_rate')} | {'packetBitrate': round(8 * sizes.get(s['index'], 0) / seconds)}
                              for s in streams],
                  'screenLimit': 'Synthetic SDR marked output; no calibrated HDR, display, surround or object-audio fidelity qualification.'}
        catalogue[key] = {k: v for k, v in record.items() if v is not None}
    assert catalogue['rr-hevc-4k24-aac']['videoPacketHash'] == catalogue['rr-hevc-4k24-truehd-pgs']['videoPacketHash'], 'HEVC baseline and selective fixture video packets differ'
    (fixtures / 'catalogue.json').write_text(json.dumps(catalogue, indent=2) + '\n')

    generator = Path(__file__).resolve()
    preparation = assets / 'preparation'
    shutil.copyfile(generator, preparation / generator.name)
    parent_manifest = engine_parent / 'manifest.json'
    manifest_path = assets / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['fixture'].update({'dimensions': 'mixed; see fixtures/catalogue.json', 'fps': 'mixed; see fixtures/catalogue.json'})
    manifest['real_resolution'] = {'generator_sha256': sha256(generator),
                                   'engine_parent_manifest_sha256': sha256(parent_manifest),
                                   'engine_parent_snapshot': str(engine_parent.resolve()),
                                   'cases': list(catalogue)}
    manifest['files'] = {str(p.relative_to(assets)): {'sha256': sha256(p), 'bytes': p.stat().st_size}
                         for p in sorted(assets.rglob('*')) if p.is_file() and p != manifest_path}
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'assets': str(assets), 'cases': {k: {'sha256': v['sha256'],
                     'videoPacketHash': v['videoPacketHash'], 'containerBitrate': v['containerBitrate']}
                     for k, v in catalogue.items()}}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--assets', type=Path, required=True)
    parser.add_argument('--engine-parent', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.assets, args.engine_parent)
