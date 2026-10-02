#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build pinned host FFmpeg oracles; these tools never enter runtime packages."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ci_slices', ROOT / 'scripts/ci-slices.py')
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    archive = ci.fetch('ffmpeg-adaptation')
    source = out / 'source'
    with tarfile.open(archive) as packed:
        packed.extractall(source, filter='data')
    source = next(source.iterdir())
    build = out / 'objects'
    build.mkdir()
    prefix = out / 'installed'
    # Host-only test tools. GPL x264 supplies controlled AVC fixtures; no binary
    # from this prefix is copied to an application or provider source package.
    command = [str(source / 'configure'), '--prefix=' + str(prefix), '--disable-doc', '--disable-debug',
               '--disable-autodetect', '--disable-x86asm', '--enable-gpl', '--enable-libx264', '--enable-libopus', '--enable-libvorbis',
               '--enable-libvpx', '--enable-libmp3lame', '--enable-libdav1d']
    subprocess.run(command, cwd=build, check=True)
    subprocess.run(['make', '-j', str(min(os.cpu_count() or 2, 4))], cwd=build, check=True)
    subprocess.run(['make', 'install'], cwd=build, check=True)
    tools = {}
    for name in ['ffmpeg', 'ffprobe']:
        path = prefix / 'bin' / name
        version = subprocess.check_output([str(path), '-version'], text=True).splitlines()[0]
        tools[name] = {'sha256': ci.sha(path), 'version': version}
    ci.write(out / 'reference-tools.json', {'sourceSHA256': ci.sha(archive), 'configure': command,
                                          'tools': tools, 'scope': 'host test oracle only'})
    if os.environ.get('GITHUB_PATH'):
        with open(os.environ['GITHUB_PATH'], 'a') as stream:
            stream.write(str(prefix / 'bin') + '\n')


if __name__ == '__main__':
    main()
