#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Verify same-revision CI artifacts and assemble portable browser-job inputs."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ci_slices', ROOT / 'scripts/ci-slices.py')
ci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ci)


def collect(inputs, output):
    expected = {row['target'] for row in ci.catalog()} | {'ffmpeg', 'ffmpeg-jspi', 'ffmpeg-asyncify', 'mpv'}
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    seen, packages = set(), []
    # Validate everything before installing or trusting any downloaded input.
    archives = []
    for receipt in sorted(inputs.rglob('ci-artifacts.json')):
        record = json.loads(receipt.read_text())
        target = record['target']
        if record['schema'] != 1 or record['commit'] != commit or target not in expected or target in seen:
            raise ValueError('Duplicate, unexpected or wrong-revision provider: ' + target)
        seen.add(target)
        members = record['files']
        if {p.name for p in receipt.parent.iterdir()} != set(members) | {'ci-artifacts.json'}:
            raise ValueError('Unexpected artifact membership: ' + target)
        for name, fact in members.items():
            if Path(name).name != name or name in ['.', '..']:
                raise ValueError('Unsafe artifact name')
            path = receipt.parent / name
            if path.is_symlink() or not path.is_file() or path.stat().st_size != fact['bytes'] or ci.sha(path) != fact['sha256']:
                raise ValueError('CI artifact drift: ' + name)
        packed = [receipt.parent / name for name in members if name.endswith('.tgz')]
        if len(packed) != 1:
            raise ValueError('Expected exactly one provider archive')
        with tarfile.open(packed[0]) as archive:
            metadata = json.load(archive.extractfile('package/package.json'))
        if metadata['name'] != '@demuxe/provider-' + target:
            raise ValueError('Provider archive target mismatch')
        archives.append((packed[0], metadata))
    if seen != expected:
        raise ValueError('Missing CI providers: ' + ', '.join(sorted(expected - seen)))
    output.mkdir(parents=True, exist_ok=False)
    core = ROOT / 'build/ci-core'
    ci.run('python3', 'scripts/package-player-core.py', '--output', core,
           env={**os.environ, 'DEMUXE_PROVIDER_CANDIDATE': '1'})
    assembly = json.loads((core / 'assembly.json').read_text())
    core_archive = Path(assembly['archive'])
    with tarfile.open(core_archive) as archive:
        archives.insert(0, (core_archive, json.load(archive.extractfile('package/package.json'))))
    for source, metadata in archives:
        shutil.copyfile(source, output / source.name)
        packages.append({'name': metadata['name'], 'version': metadata['version'], 'file': source.name,
                         'sha256': ci.sha(source), 'bytes': source.stat().st_size})
    fixture = output / 'truehd-stereo.mkv'
    recipe = ['ffmpeg', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=30',
              '-f', 'lavfi', '-i', 'aevalsrc=0.08*sin(2*PI*220*t)|0.08*sin(2*PI*330*t):s=48000:c=stereo',
              '-c:v', 'libx264', '-bf', '0', '-preset', 'ultrafast', '-c:a', 'truehd', '-strict', '-2', '-t', '12', str(fixture)]
    ci.run(*recipe)
    inventory = {'schema': 2, 'commit': commit, 'qualification': 'same-run-source-candidates', 'packages': packages,
                 'targets': sorted(expected), 'fixtures': [{'file': fixture.name, 'sha256': ci.sha(fixture), 'bytes': fixture.stat().st_size}],
                 'fixtureRecipe': recipe, 'exampleSHA256': ci.sha(ROOT / 'fixtures/example.mp4')}
    dest = output / 'bundle-ci-inventory.json'
    ci.write(dest, inventory)
    print(ci.sha(dest))


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--inputs', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    args = p.parse_args()
    collect(args.inputs.resolve(), args.output.resolve())
