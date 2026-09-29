#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build and qualify a tagged archive, generating fixtures and fetching a pinned published baseline."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'build/tag-release'
RELEASE = ROOT / 'build/release'
BASELINE_URL = 'https://github.com/Jagalite/demuxe/releases/download/v0.3.0-beta.3-rc.5/demuxe-0.3.0-beta.3.tgz'
BASELINE_SHA256 = 'b2c9d1fd8301ee8a2f40740c4267617a579da0e7d6ca51573fc0722d0fcc5e83'


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def run(argv, env=None):
    print('+', ' '.join(map(str, argv)), flush=True)
    subprocess.run(list(map(str, argv)), cwd=ROOT, env={**os.environ, **(env or {})}, check=True)


def relative(name):
    p = Path(name)
    if not name or p.is_absolute() or '..' in p.parts or '\\' in name:
        raise ValueError('Unsafe input path: ' + name)
    return p


def unpack(archive, destination):
    with tarfile.open(archive) as bundle:
        members = bundle.getmembers()
        names = set()
        for member in members:
            relative(member.name)
            if member.name in names or not (member.isfile() or member.isdir()):
                raise ValueError('Duplicate, linked or special input member: ' + member.name)
            names.add(member.name)
        destination.mkdir(parents=True, exist_ok=False)
        bundle.extractall(destination, filter='data')


def fetch_baseline():
    WORK.mkdir(parents=True, exist_ok=True)
    archive = WORK / 'baseline.tgz'
    with urllib.request.urlopen(BASELINE_URL, timeout=120) as response, archive.open('wb') as output:
        shutil.copyfileobj(response, output)
    if digest(archive) != BASELINE_SHA256:
        raise ValueError('Published baseline SHA-256 mismatch')
    unpack(archive, WORK / 'published-baseline')


def snapshot_manifest(folder, metadata):
    metadata['files'] = {str(p.relative_to(folder)): {'sha256': digest(p), 'bytes': p.stat().st_size}
                         for p in sorted(folder.rglob('*')) if p.is_file() and p != folder / 'manifest.json'}
    (folder / 'manifest.json').write_text(json.dumps(metadata, indent=2) + '\n')


def catalogue(archive):
    assets = WORK / 'candidate-assets'
    run(['python3', 'tests/head-to-head/setup.py', '--output', assets, '--expanded',
         '--optional-archive', archive])
    fixtures = assets / 'fixtures'
    sources = WORK / 'specialist-sources'
    run(['python3', 'tests/head-to-head/fetch-specialist-samples.py', sources])
    run(['python3', 'tests/head-to-head/prepare-specialist-fixtures.py', assets, sources])
    run(['python3', 'tests/head-to-head/prepare-library-fixtures.py', assets, sources])
    run(['python3', 'tests/head-to-head/validate-specialist-fixtures.py', '--assets', assets,
         '--sources', sources, '--output', WORK / 'specialist-validation'])
    data = json.loads((fixtures / 'catalogue.json').read_text())
    specialist = json.loads((assets / 'specialist.json').read_text())
    labels = {'hevc-truehd': 'HEVC + TrueHD 7.1 / MKV', 'hevc-dtshd': 'HEVC + DTS-HD MA 7.1 / MKV',
              'hevc-atmos': 'HEVC + E-AC-3 with Atmos metadata / MP4',
              'dv5': 'Dolby Vision profile 5 HEVC + E-AC-3 / MP4',
              'dv81': 'Dolby Vision profile 8.1 HEVC + E-AC-3 / MKV'}
    for key, entry in specialist.items():
        data[key] = {**data.get(key, {}), **entry, 'label': entry.get('label', labels.get(key)),
                     'video': True, 'audio': True}
        data[key].pop('blockedReason', None)
    for key, filename, label in [('aac-mp4', 'aac.mp4', 'H.264 + AAC / MP4'),
                                  ('aac-mkv', 'aac.mkv', 'H.264 + AAC / MKV'),
                                  ('pcm-mkv', 'pcm.mkv', 'H.264 + PCM24 / MKV'),
                                  ('pcm-ass', 'pcm.mkv', 'H.264 + PCM24 / MKV + ASS')]:
        for duplicate in [k for k, entry in data.items() if entry.get('label') == label]:
            del data[duplicate]
        data[key] = {'file': filename, 'label': label, 'video': True, 'audio': True, 'channels': 2}
        if key == 'pcm-ass':
            data[key].update(subtitle='captions.ass', subtitleCheck='ass', subtitleIntegration='built-in')
    for key, codec, label in [('h264-pgs-isolated', 'copy', 'H.264 + AAC + PGS / MKV (subtitle isolation)'),
                              ('h264-vobsub-isolated', 'dvdsub', 'H.264 + AAC + VobSub / MKV (subtitle isolation)')]:
        target = fixtures / (key + '.mkv')
        run(['ffmpeg', '-nostdin', '-v', 'error', '-i', fixtures / 'aac.mp4', '-fix_sub_duration',
             '-i', fixtures / 'captions.sup', '-map', '0:v', '-map', '0:a', '-map', '1:s',
             '-c:v', 'copy', '-c:a', 'copy', '-c:s', codec, target])
        data[key] = {'file': target.name, 'label': label, 'video': True, 'audio': True, 'channels': 2,
                     'embeddedSubtitle': True, 'subtitleCheck': 'bitmap'}
    # Reject missing/extra rows rather than silently shrinking the release gate.
    import importlib.util
    spec = importlib.util.spec_from_file_location('catalogue_gate', ROOT / 'scripts/compare-lgpl-catalogue.py')
    gate = importlib.util.module_from_spec(spec); spec.loader.exec_module(gate)
    rows = set(gate.readme_rows())
    data = {k: v for k, v in data.items() if v.get('label') in rows}
    if {v['label'] for v in data.values()} != rows or len(data) != len(rows):
        raise ValueError('Generated fixtures do not cover the exact current README catalogue')
    (fixtures / 'catalogue.json').write_text(json.dumps(data, indent=2) + '\n')
    # Use all assets from the exact runtime, including private fallback engines.
    installed = WORK / 'candidate-installed'
    unpack(archive, installed)
    shutil.rmtree(assets / 'demuxe')
    shutil.copytree(installed / 'package', assets / 'demuxe')
    metadata = json.loads((assets / 'manifest.json').read_text())
    snapshot_manifest(assets, metadata)
    baseline = WORK / 'baseline-assets'
    shutil.copytree(assets, baseline)
    shutil.rmtree(baseline / 'demuxe')
    shutil.copytree(WORK / 'published-baseline/package', baseline / 'demuxe')
    published = json.loads((baseline / 'demuxe/release-manifest.json').read_text())
    metadata.update(git_revision=published['sourceCommit'], source_sha256={}, dirty_diff='',
                    optionalArchiveSHA256=BASELINE_SHA256,
                    publishedBaseline={'url': BASELINE_URL, 'sha256': BASELINE_SHA256})
    snapshot_manifest(baseline, metadata)
    return baseline, assets


def candidate():
    package = json.loads((ROOT / 'package.json').read_text())
    return RELEASE / f"{package['name']}-{package['version']}.tgz"


def adaptation():
    return Path(json.loads((WORK / 'adaptation/latest.json').read_text())['engine'])


def package(tag):
    run(['python3', 'scripts/build-audio-adaptation.py', '--output', WORK / 'adaptation',
         '--sdk', os.environ['DEMUXE_SDK'], '--archive', ROOT / 'build/downloads/ffmpeg-adaptation.tar.gz', '--opus'])
    run(['python3', 'scripts/package-beta.py', '--release-tag', tag, '--output', RELEASE,
         '--adaptation-build', adaptation()])


def result_after(script, pattern, env):
    before = set(ROOT.glob(pattern))
    run(['node', script], env)
    created = set(ROOT.glob(pattern)) - before
    if len(created) != 1:
        raise ValueError(f'{script} must produce exactly one fresh result: {created}')
    return created.pop()


def run_catalogue_correctness(baseline, assets):
    # One full correctness pass per version; CPU benchmarks are opt-in elsewhere.
    for lane, snapshot in [('baseline', baseline), ('candidate', assets)]:
        run(['node', 'tests/head-to-head/run.mjs', '--assets', snapshot,
             '--output', WORK / lane, '--catalogue', '--cases', 'demuxe'])


def qualify(tag):
    run(['python3', 'scripts/prepare-release-fixtures.py'])
    archive = candidate()
    env = {'BETA_ARCHIVE': str(archive), 'HEADLESS': '1',
           'ADAPTATION_FIXTURE': str(ROOT / 'build/optimization-fixtures/long-pcm.mkv'),
           'AUTOMATIC_ADAPTATION_FIXTURE': str(ROOT / 'build/optimization-fixtures/automatic-lossless.mkv')}
    for name in ['CASES', 'ONLY', 'PROFILE', 'REPRO_UNQUALIFIED', 'DEMUXE_RUNTIME_ROOT']:
        os.environ.pop(name, None)
    results = {}
    for suite in ['consumer', 'streaming']:
        results[suite] = [result_after(f'tests/beta-{suite}.mjs', f'results/beta/{suite}-{family}-*/result.json',
                                      {**env, 'BROWSER': family}) for family in ['chrome', 'firefox']]
    results['shaka'] = [result_after('tests/shaka-package.mjs', f'results/shaka-package/{family}-*/result.json',
                                   {**env, 'BROWSER': family}) for family in ['chrome', 'firefox']]
    extra = result_after('tests/release-extra.mjs', 'results/release-extra/*/result.json', env)
    optional = WORK / 'optional'
    run(['python3', 'scripts/qualify-optional-runtime.py', '--archive', archive,
         '--adaptation-build', adaptation(), '--output', optional], env)
    baseline, assets = catalogue(archive)
    run_catalogue_correctness(baseline, assets)
    comparison = WORK / 'catalogue-comparison.json'
    run(['python3', 'scripts/compare-lgpl-catalogue.py', '--baseline', WORK / 'baseline/summary.json',
         '--candidate', WORK / 'candidate/summary.json', '--output', comparison])
    source = archive.with_name(archive.stem + '-source.tar.gz')
    run(['python3', 'scripts/verify-beta-release.py', '--archive', archive, '--source', source,
         '--consumer', *results['consumer'], '--streaming', *results['streaming'],
         '--shaka', *results['shaka'], '--extra', extra, '--optional', optional / 'qualification.json',
         '--lgpl-catalogue', comparison])
    shutil.copyfile(ROOT / 'build/beta-build.json', RELEASE / 'engine-build.json')
    shutil.copyfile(ROOT / 'build/release-fixture-recipes.json', RELEASE / 'fixture-recipes.json')
    # Preserve fresh evidence plus optional installed runtime/build hashes, without
    # bundling unrelated frozen baseline media in the public release evidence.
    with tarfile.open(RELEASE / 'qualification-evidence.tar.gz', 'w:gz') as tar:
        for report in [*results['consumer'], *results['streaming'], *results['shaka'], extra]:
            tar.add(report.parent, arcname=str(report.parent.relative_to(ROOT)))
        for folder in [WORK / 'baseline', WORK / 'candidate', optional, WORK / 'specialist-validation']:
            for path in sorted(folder.rglob('*')):
                if path.is_file() and 'installed' not in path.relative_to(folder).parts and path.suffix not in ('.f32le', '.pcm', '.mkv', '.mp4', '.thd', '.dts'):
                    tar.add(path, arcname=str(path.relative_to(ROOT)), recursive=False)
        tar.add(comparison, arcname='catalogue-comparison.json')
    files = sorted(p for p in RELEASE.iterdir() if p.is_file() and p.name != 'SHA256SUMS')
    (RELEASE / 'SHA256SUMS').write_text(''.join(f'{digest(p)}  {p.name}\n' for p in files))
    print(f'Qualified {tag}: {archive.name}; ready for GitHub Release and npm staging')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('step', choices=['baseline', 'package', 'qualify'])
    parser.add_argument('--tag')
    args = parser.parse_args()
    if args.step == 'baseline':
        fetch_baseline()
    elif not args.tag:
        parser.error('--tag is required')
    elif args.step == 'package':
        package(args.tag)
    else:
        qualify(args.tag)


if __name__ == '__main__':
    main()
