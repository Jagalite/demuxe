#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Validate the five base specialist fixtures and retain host-decoded references.

Reads existing frozen fixtures and pinned local source samples. Writes only a
new evidence directory; never changes media or promotes browser table cells.
"""
import argparse
import array
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('prepare_specialist', HERE / 'prepare-specialist-fixtures.py')
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)
SOURCES = {'hevc-truehd': 'truehd.thd', 'hevc-dtshd': 'dtshd.dts',
           'hevc-atmos': 'atmos.mp4', 'dv5': 'dv5.mp4', 'dv81': 'dv81.mp4'}


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def validate_container(key, probe):
    prepare.validate(key, probe)
    formats = probe['format']['format_name'].split(',')
    assert ('mp4' if key in ('hevc-atmos', 'dv5') else 'matroska') in formats, 'Wrong container'


def pcm_reference(data, channels):
    assert channels > 0 and len(data) % (4 * channels) == 0, 'Incomplete PCM frame'
    samples = array.array('f')
    samples.frombytes(data)
    if sys.byteorder != 'little':
        samples.byteswap()
    assert samples and all(math.isfinite(x) for x in samples), 'Missing/nonfinite PCM'
    return [{'channel': channel,
             'rms': math.sqrt(sum(x*x for x in samples[channel::channels]) / (len(samples)//channels)),
             'sha256': hashlib.sha256(b''.join(data[i:i+4] for i in range(channel*4, len(data), channels*4))).hexdigest()}
            for channel in range(channels)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--assets', required=True, type=Path)
    parser.add_argument('--sources', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    root, sources, out = args.assets.resolve(), args.sources.resolve(), args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    manifest = json.loads((root / 'manifest.json').read_text())
    catalogue = json.loads((root / 'specialist.json').read_text())
    lock = json.loads((HERE / 'specialist-sources.json').read_text())['sources']
    assert sha(root / 'specialist.json') == manifest['files']['specialist.json']['sha256'], 'Catalogue identity'
    for name in ['validate-specialist-fixtures.py', 'prepare-specialist-fixtures.py', 'specialist-sources.json']:
        (out / name).write_bytes((HERE / name).read_bytes())
    commands = []

    def run(argv):
        result = subprocess.run(argv, capture_output=True, timeout=120)
        commands.append({'argv': argv, 'exit': result.returncode, 'stderr': result.stderr.decode(errors='replace')})
        (out / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
        result.check_returncode()
        return result.stdout

    report = {'schema': 1, 'assets': str(root), 'assetsSHA256': sha(root / 'manifest.json'),
              'ffmpeg': run(['ffmpeg', '-version']).decode().splitlines()[0],
              'scope': 'Exact-profile source validation and host references only; no browser qualification, physical HDR/Dolby Vision color, lossless output, discrete output channels or Atmos object rendering claim.',
              'fixtures': {}}
    try:
        for key, name in SOURCES.items():
            print(key + ': source identity, profile, full decode and references', flush=True)
            entry = catalogue[key]
            source = sources / name
            assert sha(source) == lock[name]['sha256'] and source.stat().st_size == lock[name]['bytes'], 'Pinned source identity: ' + name
            assert entry['source']['sha256'] == lock[name]['sha256'], 'Derivative provenance: ' + key
            media = (root / 'fixtures' / entry['file']).resolve()
            assert media.is_relative_to(root / 'fixtures'), 'Fixture escapes snapshot'
            assert sha(media) == entry['sha256'] == manifest['files']['fixtures/' + entry['file']]['sha256'], 'Fixture identity: ' + key
            directory = out / key
            directory.mkdir()
            probe = json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(media)]))
            (directory / 'probe.json').write_text(json.dumps(probe, indent=2) + '\n')
            validate_container(key, probe)
            run(['ffmpeg','-nostdin','-v','error','-xerror','-i',str(media),'-map','0:v:0','-map','0:a:0','-f','null','-'])
            audio = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
            references = []
            for target in ([4, 12] if key == 'hevc-dtshd' else [1, 10]):
                prefix = ['ffmpeg','-nostdin','-v','error','-ss',str(target),'-i',str(media)]
                pcm = run(prefix + ['-map','0:a:0','-t','0.5','-c:a','pcm_f32le','-f','f32le','-'])
                assert len(pcm) >= int(audio['sample_rate'])*audio['channels']*4*.45, 'Truncated reference'
                channels = pcm_reference(pcm, audio['channels'])
                assert any(c['rms'] > .003 for c in channels), 'Silent source reference'
                (directory / f'{target}s-native-channels.f32le').write_bytes(pcm)
                stereo = run(prefix + ['-map','0:a:0','-t','0.5','-ac','2','-ar','8000','-c:a','pcm_f32le','-f','f32le','-'])
                stereo_channels = pcm_reference(stereo, 2)
                assert all(c['rms'] > .003 for c in stereo_channels), 'Silent stereo reference channel'
                (directory / f'{target}s-stereo.f32le').write_bytes(stereo)
                # Decode from the beginning so in-band HEVC parameter sets are
                # available at the reference time. Input seeking can lose them
                # in hev1 Dolby Vision clips even though the full clip decodes.
                frame = run(['ffmpeg','-nostdin','-v','error','-xerror','-i',str(media),
                             '-ss',str(target),'-map','0:v:0','-frames:v','1','-an','-f','framemd5','-'])
                assert any(line and not line.startswith(b'#') for line in frame.splitlines()), 'Missing frame reference'
                (directory / f'{target}s-base-video.framemd5').write_bytes(frame)
                references.append({'target': target, 'duration': .5, 'sampleRate': int(audio['sample_rate']),
                                   'channelLayout': audio['channel_layout'], 'channels': channels, 'stereo': stereo_channels,
                                   'videoScope': 'FFmpeg decoded base video only; not a Dolby Vision display/color oracle'})
            if key.startswith('dv'):
                frames = json.loads(run(['ffprobe','-v','error','-read_intervals','%+0.5','-select_streams','v:0','-show_frames','-show_entries','frame=side_data_list','-of','json',str(media)]))
                assert any(s['side_data_type'] == 'Dolby Vision RPU Data' for f in frames['frames'] for s in f.get('side_data_list', [])), 'Missing actual RPU payload'
                (directory / 'rpu-frames.json').write_text(json.dumps(frames, indent=2) + '\n')
            report['fixtures'][key] = {'status': 'validated', 'file': entry['file'], 'sha256': entry['sha256'],
                'source': lock[name], 'preparation': entry['preparation'], 'references': references,
                'markedVideo': not key.startswith('dv'), 'markedAudio': key.startswith('dv')}
            (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
    finally:
        (out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
        hashes = {str(p.relative_to(out)): sha(p) for p in sorted(out.rglob('*')) if p.is_file()}
        (out / 'manifest.json').write_text(json.dumps({'sha256': hashes}, indent=2) + '\n')
    print('Validated all five exact-profile fixtures; browser qualification remains separate.', flush=True)


if __name__ == '__main__':
    main()
