#!/usr/bin/env python3
"""Reuse unchanged clean engine bytes for an explicitly listed JS packaging change.

This is experimental source correspondence, never a fresh native build or release.
Every preferred source change must be listed: external web JS, public TypeScript, or the runtime packager.
Packaging changes are recorded separately and never alter the provider build record.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--built', required=True, type=Path)
p.add_argument('--snapshot', required=True, type=Path)
p.add_argument('--runtime-file', action='append', default=[])
p.add_argument('--public-file', action='append', default=[])
p.add_argument('--packaging-file', action='append', default=[])
p.add_argument('--document-file', action='append', default=[])
a = p.parse_args()
built, snapshot = a.built.resolve(), a.snapshot.resolve()
sha = lambda f: hashlib.sha256(f.read_bytes()).hexdigest()
record_file = built / 'build/beta-build.json'
build = json.loads(record_file.read_text())
assert build['clean'], 'The engine provider must have clean build evidence'
assert not (snapshot / 'build/beta-build.json').exists(), 'Do not overwrite a prior build record'

def preferred(root):
    info = json.loads((root / 'build/modernization-inputs.json').read_text())
    result = {}
    for name in ['sourceSHA256', 'overrides', 'transportOverrides', 'switchingOverrides', 'concurrentOverrides', 'integrationOverrides', 'qualityOverrides', 'liveOverrides','dashOverrides','discontinuityOverrides','subtitleOverrides','timelineOverrides']:
        result.update(info.get(name, {}))
    for name in info['removed']:
        result.pop(name, None)
    return result

old, new = preferred(built), preferred(snapshot)
changed = {n for n in set(old) | set(new) if old.get(n) != new.get(n)}
assert changed == set(a.runtime_file) | set(a.packaging_file) | set(a.public_file) | set(a.document_file), ('Unexpected preferred source changes', changed)
assert changed, 'Declare at least one source change'
assert all(n == 'README.md' or (n.startswith('docs/') and n.endswith('.md') and '..' not in Path(n).parts) for n in a.document_file)
assert all(n.startswith('web/') and n.endswith('.js') and '/engine' not in n for n in a.runtime_file)
assert all(n.startswith('src/') and n.endswith('.ts') for n in a.public_file)
assert set(a.packaging_file) <= {'scripts/package-beta.py'}
for name in changed:
    assert sha(snapshot / name) == new[name]
for name, digest in build['inputs'].items():
    assert sha(built / name) == digest, name
    if name not in a.packaging_file:
        assert digest == sha(snapshot / name), name

copied = {}
def copy(source, destination, digest):
    assert sha(source) == digest, source
    if destination.exists():
        assert sha(destination) == digest, destination
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    copied[str(destination.relative_to(snapshot))] = digest

for name in a.packaging_file:
    copy(built / name, snapshot / 'build/reused-inputs' / name, build['inputs'][name])

for name, entry in build['artifacts'].items():
    assert (built / name).stat().st_size == entry['bytes']
    copy(built / name, snapshot / name, entry['sha256'])
for name, digest in build['configurations'].items():
    copy(built / name, snapshot / name, digest)
for name, digest in build['sources'].items():
    name = 'build/downloads/' + name + '.tar.gz'
    copy(built / name, snapshot / name, digest)
for name in ['beta-build-start.json', 'beta-build.json', 'beta-toolchain.json']:
    copy(built / 'build' / name, snapshot / 'build' / name, sha(built / 'build' / name))
if not (snapshot / 'node_modules').exists():
    (snapshot / 'node_modules').symlink_to((built / 'node_modules').resolve(), target_is_directory=True)
with (snapshot / 'build/runtime-assembly.log').open('w') as log:
    subprocess.run(['npm', 'run', 'build'], cwd=snapshot, stdout=log, stderr=subprocess.STDOUT, check=True)
record = {'scope': __doc__, 'releaseQualified': False, 'freshNativeBuild': False,
          'engineBuildOrigin': str(built), 'engineBuildRecordSHA256': sha(record_file),
          'changedRuntimeFiles': {n: {'before': old.get(n), 'after': new[n]} for n in sorted(a.runtime_file)},
          'changedPublicFiles': {n: {'before': old.get(n), 'after': new[n]} for n in a.public_file},
          'changedPackagingFiles': {n: {'before': old.get(n), 'after': new[n]} for n in a.packaging_file},
          'changedDocumentationFiles': {n: {'before': old.get(n), 'after': new[n]} for n in a.document_file},
          'copied': copied, 'assemblerSHA256': sha(Path(__file__)),
          'typescriptBuildLogSHA256': sha(snapshot / 'build/runtime-assembly.log')}
(snapshot / 'build/native-build-reuse.json').write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'engineBuildOrigin': str(built), 'freshNativeBuild': False,
                  'changedRuntimeFiles': record['changedRuntimeFiles']}, indent=2))
