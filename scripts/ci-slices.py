#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build the reviewed slice catalog from locked sources; never publish or qualify it."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'licensing/ci-slices.json'


def sha(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + '\n')


def run(*args, **kwargs):
    subprocess.run([str(arg) for arg in args], cwd=ROOT, check=True, **kwargs)


def catalog():
    data = json.loads(CATALOG.read_text())
    profiles = json.loads((ROOT / 'licensing/provider-packages.json').read_text())['profiles']
    rows = data['include']
    targets = [row['target'] for row in rows]
    if data['schema'] != 1 or len(targets) != len(set(targets)) or not targets:
        raise ValueError('Invalid slice catalog')
    for row in rows:
        target = row['target']
        if target not in profiles or row['kind'] not in ['audio', 'preparation', 'container', 'web']:
            raise ValueError('Unknown slice: ' + target)
        expected = ('audio-' + row['profile'] if row['kind'] == 'audio' else
                    'ffmpeg-' + row['profile'] + '-' + row['runtime'] if row['kind'] == 'preparation' else target if row['kind'] == 'web' else 'container')
        if target != expected:
            raise ValueError('Slice recipe/target mismatch: ' + target)
        if row['kind'] == 'web':
            pin = ROOT / row['pin']
            if (profiles[target].get('runtimePin') != row['pin'] or
                    not pin.resolve().is_relative_to(ROOT) or sha(pin) != row['pinSHA256']):
                raise ValueError('Pinned web runtime changed: ' + target)
            continue
        evidence = ROOT / row['evidence']
        if not evidence.resolve().is_relative_to(ROOT) or sha(evidence) != row['evidenceSHA256']:
            raise ValueError('Slice eligibility evidence changed: ' + target)
        if json.loads(evidence.read_text()).get('passed') is not True:
            raise ValueError('Slice eligibility requires passing historical evidence: ' + target)
    return rows


def fetch(name):
    pin = next(row for row in json.loads((ROOT / 'sources.lock.json').read_text())['sources'] if row['name'] == name)
    dest = ROOT / 'build/downloads' / (name + '.tar.gz')
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        partial = dest.with_suffix('.partial')
        run('curl', '-fL', '--retry', '3', pin['url'], '-o', partial)
        if sha(partial) != pin['sha256']:
            raise ValueError('Upstream archive mismatch: ' + name)
        partial.rename(dest)
    if sha(dest) != pin['sha256']:
        raise ValueError('Upstream archive mismatch: ' + name)
    return dest


def install_sdk(sdk):
    if sdk.exists():
        raise ValueError('SDK installation requires a fresh directory')
    archive = fetch('emsdk')
    sdk.mkdir(parents=True)
    run('tar', '-xf', archive, '--strip-components=1', '-C', sdk)
    run(sdk / 'emsdk', 'install', '4.0.14')
    run(sdk / 'emsdk', 'activate', '4.0.14')


def sdk_record(sdk, output):
    base = sdk / 'upstream/emscripten'
    if json.loads((base / 'emscripten-version.txt').read_text()) != '4.0.14':
        raise ValueError('Expected SDK 4.0.14')
    record = {'sdk': str(sdk), 'sdkSources': {
        str(path.relative_to(base)): sha(path) for path in sorted(base.rglob('*'))
        if path.is_file() and not any(part in ['cache', '__pycache__', '.git', 'node_modules']
                                      for part in path.relative_to(base).parts)}}
    write(output, record)
    return output


def package(target, output, provenance=None):
    args = ['python3', 'scripts/prepare-provider-package.py', '--target', target, '--output', output / 'package']
    if provenance:
        source = output / (target + '-source.tar.gz')
        run('python3', 'scripts/package-provider-source.py', '--profile', target,
            '--record', provenance / 'engine-build.json', '--recovered', provenance / 'recovered.json',
            '--build-root', ROOT, '--output', source)
        args += ['--engine-record', provenance / 'engine-build.json', '--source-companion', source.with_suffix('.json')]
    run(*args)
    return json.loads((output / 'package/assembly.json').read_text())


def receipt(target, output, assembly):
    # Only portable deliverables cross jobs; local build paths remain provenance.
    delivery = output / 'delivery'
    delivery.mkdir()
    paths = [Path(assembly['archive']), output / 'package/build-inventory.json', output / 'package/assembly.json']
    paths += list(output.glob('*-source.tar.gz')) + list(output.glob('*-source.tar.json'))
    for path in paths:
        shutil.copyfile(path, delivery / path.name)
    record = {'schema': 1, 'target': target, 'commit': subprocess.check_output(
        ['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
        'qualification': 'source-built-audited-candidate; not release qualification',
        'files': {path.name: {'sha256': sha(path), 'bytes': path.stat().st_size} for path in delivery.iterdir()}}
    write(delivery / 'ci-artifacts.json', record)


def build(target, sdk):
    row = next(row for row in catalog() if row['target'] == target)
    output = ROOT / 'build/ci-slices' / target
    output.mkdir(parents=True, exist_ok=False)
    provenance = output / 'provenance'
    if row['kind'] in ['audio', 'preparation']:
        recorded_sdk = sdk_record(sdk, output / 'sdk.json')
        if row['kind'] == 'audio':
            profile = row['profile']
            archive = fetch('opus-audio' if profile == 'opus-encoder' else 'ffmpeg-adaptation')
            builds = output / 'native'
            args = ['python3', 'scripts/build-opus-provider.py' if profile == 'opus-encoder' else 'scripts/build-audio-providers.py',
                    '--sdk', sdk, '--archive', archive, '--out', builds]
            if profile != 'opus-encoder':
                args += ['--profile', profile]
            run(*args)
            run('python3', 'scripts/record-audio-provider-build.py', '--builds', builds,
                '--sdk', sdk, '--sdk-record', recorded_sdk, '--source-archive', archive,
                '--profiles', profile, '--output', provenance)
        else:
            fetch('ffmpeg-adaptation')
            profile, runtime = row['profile'], row['runtime']
            # The suspension bridge deliberately requires scratch outside the
            # checkout. Its exact preferred inputs are retained by the recorder.
            builds = Path(tempfile.mkdtemp(prefix='demuxe-ci-' + target + '-'))
            write(output / 'native-location.json', {'directory': str(builds)})
            try:
                run('python3', 'scripts/build-codec-preparation.py', '--profile', profile, '--suspension', runtime,
                    '--sdk', sdk, '--output', builds / (profile + '-' + runtime + '-01'), '--jobs', '2')
            finally:
                for path in builds.rglob('*'):
                    if path.is_file() and (path.suffix == '.log' or path.name in ['commands.json', 'build-result.json']):
                        retained = output / 'native' / path.relative_to(builds)
                        retained.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(path, retained)
            run('python3', 'scripts/record-codec-preparation-build.py', '--builds', builds,
                '--profiles', profile, '--runtimes', runtime, '--sdk-record', recorded_sdk, '--output', provenance)
    assembly = package(target, output, provenance if row['kind'] in ['audio', 'preparation'] else None)
    receipt(target, output, assembly)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['matrix', 'install-sdk', 'build'])
    parser.add_argument('--target')
    parser.add_argument('--sdk', type=Path, default=ROOT / 'build/emsdk-4.0.14')
    args = parser.parse_args()
    if args.action == 'matrix':
        print(json.dumps({'include': catalog()}, separators=(',', ':')))
    elif args.action == 'install-sdk':
        install_sdk(args.sdk.resolve())
    else:
        build(args.target, args.sdk.resolve())


if __name__ == '__main__':
    main()
