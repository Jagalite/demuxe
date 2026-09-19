#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Back up and promote an exactly qualified local candidate; never touches Git."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tarfile

p = argparse.ArgumentParser(description=__doc__)
for name in ['work', 'verification', 'source', 'original-inputs', 'output']:
    p.add_argument('--' + name, type=Path, required=True)
p.add_argument('--apply', action='store_true')
a = p.parse_args()
root = Path(__file__).resolve().parents[2]
work, out = a.work.resolve(), a.output.resolve()
sha = lambda f: hashlib.sha256(f.read_bytes()).hexdigest()
gate = json.loads((a.verification / 'result.json').read_text())
assert gate['passed'] and gate['build']['clean'], 'Complete feature verification required'
assert not gate['releaseQualified'] and gate['sourceTag'] is None
inputs = json.loads((work / 'build/modernization-inputs.json').read_text())
build = json.loads((work / 'build/beta-build.json').read_text())
assert sha(work / 'build/beta-build.json') == gate['build']['recordSHA256'], 'Qualified build must match the promoted snapshot'
assert sha(a.source) == gate['source']['sha256'], 'Qualified source companion required'
with tarfile.open(a.source) as archive:
    source_manifest = json.load(archive.extractfile('source-manifest.json'))
original = json.loads(a.original_inputs.read_text())
for name, digest in original.items():
    assert sha(root / name) == digest, 'Original working file changed: ' + name
expected = {}
for key in ['overrides', 'transportOverrides', 'switchingOverrides',
            'concurrentOverrides', 'integrationOverrides', 'qualityOverrides',
            'liveOverrides', 'dashOverrides', 'discontinuityOverrides',
            'subtitleOverrides', 'timelineOverrides']:
    expected.update(inputs.get(key, {}))
for name, entry in build['artifacts'].items():
    expected[name] = entry['sha256']
# Generated entrypoints are rebuilt from the qualified TypeScript sources.
for f in (work / 'web/generated').rglob('*'):
    if f.is_file():
        expected[str(f.relative_to(work))] = sha(f)
removals = inputs['removed']
assert not set(removals) & set(expected)
changes = []
for name in sorted(set(expected) | set(removals)):
    relative = Path(name)
    assert not relative.is_absolute() and '..' not in relative.parts
    target = root / name
    assert target.resolve().is_relative_to(root) and not target.is_symlink(), name
    before = sha(target) if target.exists() else None
    after = expected.get(name)
    if after is not None:
        if name not in build['artifacts']:
            assert source_manifest['files']['demuxe/' + name] == after, 'Unqualified source: ' + name
        assert sha(work / name) == after, 'Candidate source changed: ' + name
    if before != after:
        changes.append({'path': name, 'before': before, 'after': after})
assert not out.exists(), 'Use a new promotion evidence directory'
out.mkdir(parents=True)
record = {'applied': False, 'verificationSHA256': sha(a.verification / 'result.json'),
          'work': str(work), 'originalFilesChecked': len(original), 'changes': changes}
(out / 'plan.json').write_text(json.dumps(record, indent=2) + '\n')
if a.apply:
    # Finish and verify every backup before modifying any working file.
    for change in changes:
        name = change['path']
        if change['before'] is not None:
            backup = out / 'before' / name
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / name, backup)
            assert sha(backup) == change['before'], name
    for change in changes:
        target = root / change['path']
        assert (sha(target) if target.exists() else None) == change['before'], change['path']
    for change in changes:
        target = root / change['path']
        if change['after'] is None:
            target.unlink()
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(work / change['path'], target)
        assert (sha(target) if target.exists() else None) == change['after'], change['path']
    record['applied'] = True
(out / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'applied': record['applied'], 'changedFiles': len(changes)}))
