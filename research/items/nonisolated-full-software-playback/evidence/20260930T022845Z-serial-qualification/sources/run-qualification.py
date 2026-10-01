#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Run declared browser correctness gates serially; no CPU benchmarks."""
import argparse
import datetime
import json
import os
from pathlib import Path
import subprocess

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('external', type=Path)
p.add_argument('asset_root', type=Path)
p.add_argument('evidence', type=Path)
a = p.parse_args()
tests = Path(__file__).resolve().parent
root = tests.parents[3]
external = a.external.resolve()
evidence = a.evidence.resolve()
build = external / 'playback-link-02'
installed = external / 'playback-install-02'
references = external / 'readme-references-01'
record = {'scope': 'Experimental private Software browser correctness gates; '
          'public factory/admission and exact release archive remain unqualified',
          'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'command': ['python3', str(Path(__file__).resolve()), *os.sys.argv[1:]],
          'checks': [], 'cpuMeasured': False}
driver_output = evidence / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-serial-qualification')
driver_output.mkdir(parents=True, exist_ok=False)
(driver_output / 'sources').mkdir()
(driver_output / 'sources/run-qualification.py').write_bytes(Path(__file__).read_bytes())


def run(label, command, environment=None):
    output = evidence / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + label)
    # The individual runners accept their output argument at different positions.
    full = [str(value) for value in command]
    full = [str(output) if value == '{output}' else value for value in full]
    env = {**os.environ, **(environment or {})}
    with (driver_output / (label + '.log')).open('w') as log:
        rc = subprocess.run(full, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT).returncode
    entry = {'name': label, 'command': full, 'environment': environment or {},
             'returncode': rc, 'output': str(output)}
    record['checks'].append(entry)
    (driver_output / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(entry), flush=True)


fixture = json.loads((references / 'mpeg2-ac3/profile.json').read_text())['fixture']
runner = ['node', tests / 'run-playback.mjs', build, '{output}', fixture,
          references / 'mpeg2-ac3/reference.rgb', references / 'mpeg2-ac3/reference.f32',
          references / 'mpeg2-ac3/profile.json']
run('installed-lifecycle-current', runner, {'PLAYBACK_QUALIFICATION': 'lifecycle',
    'PLAYBACK_INSTALLED_ROOT': str(installed), 'PLAYBACK_BROWSER': 'chrome'})
for browser, runtime in [('chrome', 'jspi'), ('chrome', 'asyncify'), ('firefox', 'asyncify')]:
    run('backend-controls-current-' + browser + '-' + runtime,
        ['node', tests / 'run-private-backend.mjs', a.asset_root.resolve(), references, '{output}'],
        {'PLAYBACK_INSTALLED_ROOT': str(installed), 'PLAYBACK_BROWSER': browser,
         'PLAYBACK_RUNTIME': runtime, 'PLAYBACK_ROW': 'mpeg4-mp3'})
hd = external / '1080p-03'
run('1080p-current-output', ['node', tests / 'run-playback.mjs', build, '{output}',
    hd / 'mpeg2.ts', hd / 'reference.rgb.gz', hd / 'reference.f32', hd / 'profile.json'],
    {'PLAYBACK_BROWSER': 'chrome', 'PLAYBACK_QUALIFICATION': 'bounded'})
for browser in ['chrome', 'firefox']:
    run('continuous-current-' + browser,
        ['python3', tests / 'run-readme-rows.py', build, references, '{output}'],
        {'PLAYBACK_BROWSER': browser, 'PLAYBACK_QUALIFICATION': 'continuous'})
record['passed'] = all(check['returncode'] == 0 for check in record['checks'])
record['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
(driver_output / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
print(driver_output, flush=True)
raise SystemExit(0 if record['passed'] else 1)
