# SPDX-License-Identifier: Apache-2.0
"""Prepare real compressed bitstream screens in a fresh setup.py asset snapshot.

Source media stays local. These fixtures do not replace marked correctness inputs.
Run once, before consuming the asset snapshot. No production routing changes.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def validate(key, probe):
    video = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    audio = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
    assert video['codec_name'] == 'hevc', 'HEVC required'
    if key in ('hevc-truehd', 'hevc-dtshd'):
        assert audio['codec_name'] == ('truehd' if key == 'hevc-truehd' else 'dts')
        assert audio['channels'] == 8 and audio['channel_layout'] == '7.1', '7.1 required'
        if key == 'hevc-dtshd':
            assert audio['profile'] == 'DTS-HD MA', 'DTS core is not DTS-HD MA'
    else:
        assert audio['codec_name'] == 'eac3'
    if key == 'hevc-atmos':
        assert 'Atmos' in (audio.get('profile') or ''), 'E-AC-3 alone is not Atmos'
    if key in ('dv5', 'dv81'):
        dovi = next(s for s in video['side_data_list'] if s['side_data_type'] == 'DOVI configuration record')
        assert dovi['dv_profile'] == (5 if key == 'dv5' else 8)
        assert dovi['dv_bl_signal_compatibility_id'] == (0 if key == 'dv5' else 1)
        assert dovi['rpu_present_flag'] == 1 and dovi['bl_present_flag'] == 1
    assert 35.5 < float(probe['format']['duration']) < 37, 'bounded duration required'


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('assets', type=Path)
    p.add_argument('sources', type=Path)
    a = p.parse_args()
    root, sources = a.assets.resolve(), a.sources.resolve()
    target = root / 'fixtures/specialist'
    target.mkdir()  # Never overwrite consumed evidence.
    commands = []

    def run(args):
        r = subprocess.run(args, capture_output=True, text=True)
        commands.append({'argv': args, 'exit': r.returncode, 'stderr': r.stderr})
        (target / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
        r.check_returncode()
        return r.stdout

    # The real 7.1 FATE regression is only ~0.107 s. Repeat compressed bytes,
    # not decoded/re-encoded audio. This deliberately narrow stimulus is disclosed.
    (target / 'repeated-truehd.thd').write_bytes((sources / 'truehd.thd').read_bytes() * 360)
    run(['ffmpeg','-nostdin','-v','error','-i',str(sources / 'dtshd.dts'),'-map','0:a:0','-c:a','copy','-t','8',str(target / 'clean-dts.dts')])
    (target / 'repeated-dts.dts').write_bytes((target / 'clean-dts.dts').read_bytes() * 5)
    fixtures = {}
    for key, name in [('hevc-truehd','truehd.thd'),('hevc-dtshd','dtshd.dts'),('hevc-atmos','atmos.mp4'),('dv5','dv5.mp4'),('dv81','dv81.mp4')]:
        ext = 'mp4' if key in ('dv5','hevc-atmos') else 'mkv'
        output = target / (key + '.' + ext)
        synthetic = root / 'fixtures/source-hevc10.mkv'
        args = ['ffmpeg','-nostdin','-v','warning']
        if key.startswith('dv'):
            args += ['-i',str(sources / name),'-f','lavfi','-i','aevalsrc=0.15*sin(2*PI*440*t)|0.15*sin(2*PI*880*t):s=48000:d=36:c=stereo']
            audio = ['-c:a','eac3','-b:a','384k']
        else:
            audiofile = target / 'repeated-truehd.thd' if key == 'hevc-truehd' else target / 'repeated-dts.dts' if key == 'hevc-dtshd' else sources / name
            args += ['-i',str(synthetic)]
            if key == 'hevc-atmos':
                args += ['-ss','10']
            args += ['-i',str(audiofile)]
            audio = ['-c:a','copy']
        args += ['-map','0:v:0','-map','1:a:0','-c:v','copy',*audio,'-t','36']
        if ext == 'mp4':
            args += ['-tag:v','hev1' if key == 'dv5' else 'hvc1','-movflags','+faststart','-strict','unofficial']
        args += [str(output)]
        run(args)
        probe = json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(output)]))
        validate(key, probe)
        if key in ('dv5', 'dv81'):
            frames = json.loads(run(['ffprobe','-v','error','-read_intervals','%+0.1','-select_streams','v:0','-show_frames','-show_entries','frame=side_data_list','-of','json',str(output)]))
            assert any(d['side_data_type'] == 'Dolby Vision RPU Data' for f in frames['frames'] for d in f.get('side_data_list', [])), 'Actual RPU payload missing'
            (target / (key + '.frames.json')).write_text(json.dumps(frames, indent=2) + '\n')
        # Decode the complete bounded file with host FFmpeg to reject damaged tails.
        run(['ffmpeg','-nostdin','-v','error','-xerror','-i',str(output),'-f','null','-'])
        (target / (key + '.probe.json')).write_text(json.dumps(probe, indent=2) + '\n')
        provenance = json.loads((sources / (name + '.download.json')).read_text())
        assert sha(sources / name) == provenance['sha256']
        fixtures[key] = {'file': str(output.relative_to(root / 'fixtures')), 'sha256': sha(output), 'probe': probe,
                         'source': provenance, 'sourceLicense': 'NOASSERTION; external technical sample, not redistributed',
                         'qualificationLimit': 'Basic playback only; no lossless, discrete surround, Atmos objects, Dolby Vision color, tone mapping or physical HDR qualification.',
                         'preparation': 'Repeated ~0.107 s genuine 7.1 regression audio; synthetic HEVC video' if key == 'hevc-truehd' else 'Compressed specialist stream copied; DTS repeats a clean 8-second segment; DV uses synthetic stereo E-AC-3; other audio cases use synthetic HEVC'}
        print(key, 'validated', flush=True)
    (root / 'specialist.json').write_text(json.dumps(fixtures, indent=2) + '\n')
    manifest_path = root / 'manifest.json'
    manifest = json.loads(manifest_path.read_text())
    (root / 'parent-manifest.json').write_bytes(manifest_path.read_bytes())
    for file in [root / 'parent-manifest.json', root / 'specialist.json', *target.rglob('*')]:
        if file.is_file():
            manifest['files'][str(file.relative_to(root))] = {'sha256': sha(file), 'bytes': file.stat().st_size}
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
