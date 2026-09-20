#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Prepare an immutable comparison input snapshot; never build into the live player."""
import argparse
import concurrent.futures
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tarfile
import urllib.request

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]


def sha(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for part in iter(lambda: stream.read(1048576), b''):
            h.update(part)
    return h.hexdigest()


def fetch(url, target, expected, cached=None):
    target.parent.mkdir(parents=True, exist_ok=True)
    if cached and cached.is_file() and sha(cached) == expected:
        shutil.copyfile(cached, target)
    else:
        with urllib.request.urlopen(url, timeout=90) as response, target.open('wb') as output:
            shutil.copyfileobj(response, output)
    if sha(target) != expected:
        raise ValueError('Dependency hash mismatch: ' + str(target))


def extract(archive, target):
    with tarfile.open(archive) as bundle:
        for member in bundle.getmembers():
            relative = Path(member.name)
            if relative.is_absolute() or '..' in relative.parts or relative.parts[0] != 'package':
                raise ValueError('Unsafe package member: ' + member.name)
            if not (member.isfile() or member.isdir()):
                raise ValueError('Package links/special files are not accepted: ' + member.name)
        bundle.extractall(target, filter='data')


def prepare(args):
    if args.duration < 12:
        raise ValueError('Fixture duration must be at least 12 seconds')
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=False)
    lab = Path(args.lab).resolve() if args.lab else None
    commands = []

    def run(command):
        result = subprocess.run(command, cwd=REPO, capture_output=True, text=True)
        commands.append({'argv': command, 'cwd': str(REPO), 'exit': result.returncode,
                         'stdout': result.stdout, 'stderr': result.stderr})
        (out / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
        if result.returncode:
            raise ValueError('Setup command failed; inspect commands.json: ' + command[0])
        return result.stdout

    lock = json.loads((HERE / 'assets.lock.json').read_text())
    for entry in lock['packages']:
        archive = out / 'downloads' / (entry['name'] + '.tgz')
        fetch(entry['url'], archive, entry['sha256'], lab / entry['lab_path'] if lab else None)
        extract(archive, out / 'packages' / entry['name'])
    downloads = []
    for entry in lock['runtime']['files']:
        url = f'https://raw.githubusercontent.com/zhaohappy/libmedia/{lock["runtime"]["commit"]}/{entry["path"]}'
        downloads.append((url, out / 'libmedia' / entry['path'], entry['sha256'], lab / entry['lab_path'] if lab else None))
    for entry in lock['libass']['files']:
        url = f'https://unpkg.com/libass-wasm@{lock["libass"]["version"]}/{entry["path"]}'
        downloads.append((url, out / 'libass' / entry['path'], entry['sha256'], lab / entry['lab_path'] if lab else None))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda values: fetch(*values), downloads))

    # Freeze source and compile current TS to the snapshot, not web/generated in the checkout.
    source_paths = sorted((REPO / 'src').rglob('*.ts')) + sorted((REPO / 'web').glob('*.js'))
    before = {str(p.relative_to(REPO)): sha(p) for p in source_paths}
    player = out / 'demuxe'
    (player / 'web').mkdir(parents=True)
    for path in (REPO / 'web').glob('*.js'):
        shutil.copyfile(path, player / 'web' / path.name)
    run(['node', 'node_modules/typescript/bin/tsc', '--project', 'tsconfig.json', '--outDir', str(player / 'web/generated')])
    engines = {}
    for name in ['engine-remux', 'engine-hybrid', 'engine-software-full', 'engine-adaptation', 'engine-ass']:
        source = REPO / 'web' / name
        engines[name] = source.is_dir()
        if source.is_dir():
            shutil.copytree(source, player / 'web' / name)
    for name in ['LICENSE', 'LICENSES', 'third_party', 'docs/LICENSING.md', 'docs/MEDIA-NOTICES.md', 'fixtures/FONT-LICENSE.txt']:
        source, target = REPO / name, player / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, target) if source.is_dir() else shutil.copyfile(source, target)
    (player / 'fixtures').mkdir(exist_ok=True)
    shutil.copyfile(REPO / 'fixtures/DejaVuSans.ttf', player / 'fixtures/DejaVuSans.ttf')
    after = {str(p.relative_to(REPO)): sha(p) for p in source_paths}
    if before != after:
        raise ValueError('Player source changed during preparation; discard no files, prepare a new snapshot.')
    fixtures = out / 'fixtures'
    fixtures.mkdir()
    shutil.copyfile(REPO / 'fixtures/DejaVuSans.ttf', fixtures / 'DejaVuSans.ttf')
    shutil.copyfile(REPO / 'fixtures/FONT-LICENSE.txt', fixtures / 'FONT-LICENSE.txt')
    (fixtures / 'NOTICES.md').write_text('Synthetic marked video and stereo tones generated by tests/head-to-head/setup.py. No movie content. Original fixture material: CC-BY-4.0, Demuxe contributors. Font retains FONT-LICENSE.txt.\n')
    video = (f"nullsrc=s=320x180:r=30:d={args.duration},"
             "geq=lum='if(between(Y,70,100)*between(X,mod(T*40,240),mod(T*40,240)+40),235,16)':cb=128:cr=128,"
             "drawbox=x=0:y=0:w=320:h=40:color=red:t=fill:enable='lt(t,4)',"
             "drawbox=x=0:y=0:w=320:h=40:color=blue:t=fill:enable='gte(t,4)*lt(t,8)',"
             "drawbox=x=0:y=0:w=320:h=40:color=green:t=fill:enable='gte(t,8)'")
    run(['ffmpeg', '-nostdin', '-v', 'error', '-f', 'lavfi', '-i', video,
         '-f', 'lavfi', '-i', f'aevalsrc=0.15*sin(2*PI*440*t)|0.15*sin(2*PI*880*t):s=48000:d={args.duration}',
         '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-threads', '1', '-pix_fmt', 'yuv420p',
         '-preset', 'fast', '-g', '30', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(fixtures / 'aac.mp4')])
    run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(fixtures / 'aac.mp4'), '-map', '0', '-c', 'copy', str(fixtures / 'aac.mkv')])
    run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(fixtures / 'aac.mp4'), '-map', '0', '-c:v', 'copy', '-c:a', 'pcm_s24le', str(fixtures / 'pcm.mkv')])
    (fixtures / 'captions.ass').write_text('''[Script Info]
ScriptType: v4.00+
PlayResX: 320
PlayResY: 180
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,20,&H00FF00FF,&H00FF00FF,&H00FF00FF,&H00FF00FF,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.50,0:00:11.80,Default,,0,0,0,,{\\an7\\pos(220,130)\\p1}m 0 0 l 70 0 70 30 0 30
''')
    caption = fixtures / 'captions.ass'
    end = args.duration - .2
    caption.write_text(caption.read_text().replace('0:00:11.80', f'0:{int(end // 60):02d}:{end % 60:05.2f}'))
    for name in ['aac.mp4', 'aac.mkv', 'pcm.mkv']:
        metadata = run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(fixtures / name)])
        (fixtures / (name + '.probe.json')).write_text(metadata)
        # Host packet hashes establish the copy relation, not browser decoder correctness.
        proof = run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(fixtures / name), '-map', '0:v:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-'])
        (fixtures / (name + '.video-packets.sha256')).write_text(proof)
    proofs = {(fixtures / (name + '.video-packets.sha256')).read_text() for name in ['aac.mp4', 'aac.mkv', 'pcm.mkv']}
    if len(proofs) != 1:
        raise ValueError('Fixture video packet identity mismatch')
    if args.expanded:
        from expand import generate
        generate(fixtures, run, args.duration)
    manifest = {'schema': 1, 'fixture': {'duration': args.duration, 'dimensions': [320,180], 'fps': 30},
                'git_revision': run(['git', 'rev-parse', 'HEAD']).strip(),
                'source_sha256': before, 'dirty_diff': run(['git', 'diff', '--', 'src', 'web']),
                'engines': engines, 'ffmpeg': run(['ffmpeg', '-version']).splitlines()[0],
                'setup_script_sha256': sha(Path(__file__)), 'expanded_generator_sha256': sha(HERE / 'expand.py') if args.expanded else None, 'assets_lock_sha256': sha(HERE / 'assets.lock.json'),
                'limits': ['Digital marked-output checks only, not physical output, exhaustive codec support or release qualification.',
                           'Missing local optional engines are recorded; older lab binaries are never substituted.'],
                'files': {str(p.relative_to(out)): {'sha256': sha(p), 'bytes': p.stat().st_size}
                          for p in sorted(out.rglob('*')) if p.is_file()}}
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'assets': str(out), 'files': len(manifest['files']), 'engines': engines}, indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, help='New directory, normally under build/head-to-head/')
    parser.add_argument('--lab', help='Optional preserved lab cache. Every reused dependency is hash-checked.')
    parser.add_argument('--expanded', action='store_true', help='Generate all planned catalogue fixtures or record preparation blockers')
    parser.add_argument('--duration', type=int, default=36)
    try:
        prepare(parser.parse_args())
    except (ValueError, FileExistsError) as error:
        raise SystemExit(str(error))
