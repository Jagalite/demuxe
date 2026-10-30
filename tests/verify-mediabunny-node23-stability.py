#!/usr/bin/env python3
"""Bind a completed unchanged Node 23 stability run to current candidate inputs."""
import copy
import hashlib
import json
import subprocess
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


gate = Path('results/api-stability/gate-unit-all-node-1793345784016')
raw = (gate / 'result.json').read_bytes()
report = json.loads(raw)
log = (gate / 'unit.log').read_bytes()
types = (gate / 'types.log').read_bytes()
inventory_bytes = Path('/private/tmp/demuxe-mediabunny-node23-core-drift.json').read_bytes()
inventory = json.loads(inventory_bytes)
compiled_bytes = Path('/private/tmp/demuxe-node23-stability-compiled.json').read_bytes()
compiled = json.loads(compiled_bytes)
assert subprocess.check_output(['node', '--version'], text=True).strip() == 'v23.5.0'


def check(result):
    assert result['passed'] is True and result['tier'] == 'unit'
    assert result['revision'] == inventory['head'] == '9702315e7aac272c718cd14ae190b8b37b7a3140'
    assert len(result['runs']) == 2 and all(r == {'code': 0, 'signal': None, 'timedOut': False} for r in result['runs'])
    assert len(result['files']) == 233 and len(set(result['files'])) == 233
    assert b'tests 3659' in log and b'pass 3659' in log and b'fail 0' in log and b'cancelled 0' in log and b'skipped 0' in log


check(report)
assert len(inventory['inputs']) == 236
for item in inventory['inputs']:
    assert sha(Path(item['path']).read_bytes()) == item['worktreeSHA256']
generated = {}
for name, output in compiled['outputs'].items():
    if not name.startswith('web/generated/') or name == 'web/generated/internal/provider-build.js':
        continue
    actual = Path(name).read_text()
    expected = output['data']
    notice = '// SPDX-License-Identifier: Apache-2.0\n'
    if actual.startswith(notice) and not expected.startswith(notice):
        actual = actual[len(notice):]
    assert actual == expected, name
    generated[name] = sha(Path(name).read_bytes())
assert len(generated) == 260
mutations = [lambda r: r.update(passed=False), lambda r: r['runs'][0].update(timedOut=True),
             lambda r: r['files'].pop()]
for mutate in mutations:
    altered = copy.deepcopy(report)
    mutate(altered)
    try:
        check(altered)
    except AssertionError:
        pass
    else:
        raise AssertionError('Changed gate receipt accepted')
print(json.dumps({'status': 'node23-unchanged-stability-passed-not-release', 'node': 'v23.5.0',
                  'revision': report['revision'], 'gateResultSHA256': sha(raw), 'unitLogSHA256': sha(log),
                  'typesLogSHA256': sha(types), 'inventorySHA256': sha(inventory_bytes),
                  'compiledOutputSHA256': sha(compiled_bytes), 'testFiles': len(report['files']),
                  'testFileSHA256': {name: sha(Path(name).read_bytes()) for name in report['files']},
                  'gateInputSHA256': {name: sha(Path(name).read_bytes()) for name in [
                      'tests/api-stability/run.mjs', 'tests/api-stability/suites.mjs',
                      'tests/integration-types.ts', 'tests/api-stability/consumer-types.ts',
                      'tests/provider-preferences-types.ts', 'tsconfig.json', 'package-lock.json']},
                  'generatedFiles': len(generated), 'generatedSHA256': generated,
                  'testsPassed': 3659, 'negativeControls': len(mutations),
                  'limits': ['The earlier Node 23 timeout remains a failed run.',
                             'Generated provider-build.js is excluded; this is not provider or release qualification.',
                             'The existing source-qualification drift is unchanged.',
                             'The log, report, compiled output and input inventory remain local artifacts.']}, indent=2))
