#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Run the existing qualification workloads on one unqualified upgrade archive."""
import argparse
import hashlib
import json
import os
import signal
import shutil
from pathlib import Path
import subprocess
import time
import tarfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--work', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--archive', type=Path, help='Qualify these existing archive bytes instead of packaging another archive')
parser.add_argument('--transport', action='store_true', help='Use accepted-seek and incremental-playback gates for the transport stage')
parser.add_argument('--integration', action='store_true', help='Add integrated session gates and retain standard compatibility streaming suites')
parser.add_argument('--stream-fixtures', type=Path, help='Aligned HLS/DASH ladder for integration')
parser.add_argument('--large-fixture', type=Path)
parser.add_argument('--streaming-fixture', type=Path)
args = parser.parse_args()
args.transport = args.transport or args.integration
if args.integration and (not args.stream_fixtures or not (args.stream_fixtures / 'fixture-manifest.json').is_file()):
    parser.error('Integration qualification requires an existing aligned streaming fixture')
if args.transport and (not args.large_fixture or not args.streaming_fixture):
    parser.error('Transport qualification requires both fixture paths')
if args.transport and (not args.large_fixture.is_dir() or not args.streaming_fixture.is_file()):
    parser.error('Both transport fixtures must exist before any qualification work starts')
work, out = args.work.resolve(), args.output.resolve()
if out.exists():
    raise SystemExit('Use a new evidence directory')
out.mkdir(parents=True)
(out / 'tmp').mkdir()
env = {**os.environ, 'TMPDIR': str(out / 'tmp')}
for option in ['ONE', 'CASES', 'TRACE_PACKETS', 'TRACE_EVENTS', 'CANDIDATE_DELAY_MS', 'DIRECT_ENGINE_SEEK', 'UNIFIED_PLAYER_OVERRIDE']:
    env.pop(option, None)
package = json.loads((work / 'package.json').read_text())
archive = out / f"{package['name']}-{package['version']}.tgz"
if args.archive:
    original = args.archive.resolve()
    shutil.copyfile(original, archive)
    with tarfile.open(archive) as candidate:
        metadata = json.load(candidate.extractfile('package/package.json'))
    if (metadata['name'], metadata['version']) != (package['name'], package['version']):
        raise SystemExit('Candidate package identity differs from prepared source')
    (out / 'package.log').write_text('Copied exact candidate archive: ' + str(original) + '\n')
else:
    with (out / 'package.log').open('w') as log:
        subprocess.run(['python3', 'scripts/package-beta.py', '--output', str(out)],
                       cwd=work, env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
env['BETA_ARCHIVE'] = str(archive)
with tarfile.open(archive) as tar:
    reader = out / 'archived-range-reader.mjs'
    reader.write_bytes(tar.extractfile('package/web/range-reader.js').read())
env['RANGE_READER_MODULE'] = str(reader)
jobs = [('consumer-chrome', ['node', 'tests/beta-consumer.mjs'], 'chrome'),
        ('consumer-firefox', ['node', 'tests/beta-consumer.mjs'], 'firefox'),
        ('streaming-chrome', ['node', 'tests/beta-streaming.mjs'], 'chrome'),
        ('streaming-firefox', ['node', 'tests/beta-streaming.mjs'], 'firefox'),
        ('api-component-cli-types', ['node', 'tests/release-extra.mjs'], 'chrome'),
        ('compatibility-chrome', ['node', 'tests/compatibility-expansion.mjs'], 'chrome'),
        ('archived-deadline', ['node', '--test', 'tests/range-reader-deadline.mjs'], 'injected-node')]
if args.transport:
    harness = Path(__file__).resolve().parent / 'transport'
    if not args.integration:
        jobs = [j for j in jobs if not j[0].startswith('streaming-')]
    for browser in ['chrome', 'firefox']:
        jobs.insert(2, ('accepted-seek-' + browser, ['node', str(harness / 'cancellation-browser.mjs')], browser))
        jobs.insert(2, ('incremental-playback-' + browser, ['node', str(harness / 'browser.mjs')], browser))
    env.update(LARGE_FIXTURE=str(args.large_fixture.resolve()), STREAMING_FIXTURE=str(args.streaming_fixture.resolve()))
if args.integration:
    harness = Path(__file__).resolve().parent
    extracted = out / 'unit-consumer'
    with tarfile.open(archive) as tar:
        tar.extractall(extracted, filter='data')
    env.update(UNIFIED_PLAYER_MODULE=str(extracted / 'package/web/generated/unified-player.js'),
               STREAM_FIXTURES=str(args.stream_fixtures.resolve()))
    jobs.extend([
        ('seek-queue', ['node', '--test', str(harness / 'transport/seek-queue.test.mjs')], 'injected-node'),
        ('integrated-session-chrome', ['node', str(harness / 'integration/probe-mpv-session.mjs')], 'chrome'),
        ('integrated-session-firefox', ['node', str(harness / 'integration/probe-mpv-session.mjs')], 'firefox'),
    ])
record = {'stage': 'adaptive-integration' if args.integration else 'incremental-transport' if args.transport else 'baseline-restoration', 'releaseQualified': False,
          'driverSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'streamFixtureManifestSHA256': hashlib.sha256((args.stream_fixtures / 'fixture-manifest.json').read_bytes()).hexdigest() if args.integration else None,
          'fixtureInputsSHA256': hashlib.sha256((work / 'build/qualification-fixture-inputs.json').read_bytes()).hexdigest() if (work / 'build/qualification-fixture-inputs.json').exists() else None,
          'engineReuseSHA256': hashlib.sha256((work / 'build/native-build-reuse.json').read_bytes()).hexdigest() if (work / 'build/native-build-reuse.json').exists() else None,
          'archive': archive.name, 'archiveSHA256': digest, 'bytes': archive.stat().st_size,
          'buildRecordSHA256': hashlib.sha256((work / 'build/beta-build.json').read_bytes()).hexdigest(),
          'checks': []}
if args.transport:
    record['transportFixtureInputs'] = {
        'streaming': {'bytes': args.streaming_fixture.stat().st_size,
                      'sha256': hashlib.sha256(args.streaming_fixture.read_bytes()).hexdigest()},
        'large': {str(f.relative_to(args.large_fixture)): hashlib.sha256(f.read_bytes()).hexdigest()
                  for f in sorted(args.large_fixture.rglob('*')) if f.is_file()},
    }
for name, command, browser in jobs:
    harness_file = next((Path(c) if Path(c).is_absolute() else work / c for c in command[1:] if c.endswith('.mjs')), None)
    harness_hash = hashlib.sha256(harness_file.read_bytes()).hexdigest() if harness_file else None
    began = time.monotonic()
    with (out / (name + '.log')).open('w') as log:
        process = subprocess.Popen(command, cwd=work, env={**env, 'BROWSER': browser, 'OUT': str(out / name)},
                                   stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        try:
            code = process.wait(timeout=1200)
        except subprocess.TimeoutExpired:
            code = None
            # Terminate only this harness's process group, including its browsers.
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
    record['checks'].append({'name': name, 'command': command, 'browser': browser,
                             'harnessSHA256': harness_hash,
                             'exit': code, 'passed': code == 0, 'seconds': time.monotonic() - began,
                             'logSHA256': hashlib.sha256((out / (name + '.log')).read_bytes()).hexdigest()})
    record['passed'] = len(record['checks']) == len(jobs) and all(c['passed'] for c in record['checks'])
    (out / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
    print(name, 'exit', code, flush=True)
if hashlib.sha256(archive.read_bytes()).hexdigest() != digest:
    raise SystemExit('Archive changed during qualification')
raise SystemExit(0 if record['passed'] else 1)
