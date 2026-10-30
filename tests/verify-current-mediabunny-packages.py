#!/usr/bin/env python3
"""Recheck local candidate archives and release guard without granting qualification."""
import hashlib
import json
import subprocess
import tarfile
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


unit = Path('/private/tmp/demuxe-mediabunny-current-unit.log').read_bytes()
pack = Path('/private/tmp/demuxe-mediabunny-current-pack-guard.log').read_bytes()
assert all(item in unit for item in [b'tests 78', b'pass 78', b'fail 0', b'cancelled 0', b'skipped 0', b'Ran 5 tests', b'OK'])
assert b'Provider is not release-qualified' in pack and b'npm error code 1' in pack
package = json.loads(Path('packages/provider-mediabunny/package.json').read_bytes())
assert package['private'] is True and 'Provider is not release-qualified' in package['scripts']['prepack']
root = Path('/private/tmp/demuxe-reader-preservation-source-audit')
deployment_bytes = Path('/private/tmp/demuxe-reader-combined-composed/demuxe-providers.json').read_bytes()
deployment = json.loads(deployment_bytes)
providers = {p['id']: p for p in deployment['providers']}
results = []
for kind in ('webm', 'mp4', 'stream'):
    archive, record = root / f'{kind}.tgz', root / f'{kind}-record.json'
    archive_bytes, record_bytes = archive.read_bytes(), record.read_bytes()
    result = subprocess.run(['python3', 'scripts/audit-provider-package.py', '--target', 'mediabunny-candidate',
                             '--archive', str(archive), '--record', str(record), '--record-sha256', sha(record_bytes)],
                            capture_output=True, text=True, check=True)
    assert 'not release-qualified' in result.stdout
    with tarfile.open(archive, 'r:gz') as tar:
        manifest = json.load(tar.extractfile('package/provider-manifest.json'))
        metadata = json.load(tar.extractfile('package/package.json'))
    offer = manifest['provides'][0]
    assert metadata['private'] is True and metadata['peerDependencies']['demuxe'] == '1.1.2'
    assert offer['implementationIdentity'] == providers[offer['id']]['implementationIdentity']
    results.append({'kind': kind, 'provider': offer['id'], 'identity': offer['implementationIdentity'],
                    'archiveSHA256': sha(archive_bytes), 'recordSHA256': sha(record_bytes)})
print(json.dumps({'status': 'private-candidate-audit-and-unit-passed-release-blocked',
                  'unitLogSHA256': sha(unit), 'packGuardLogSHA256': sha(pack),
                  'packageJSONSHA256': sha(Path('packages/provider-mediabunny/package.json').read_bytes()),
                  'deploymentManifestSHA256': sha(deployment_bytes), 'unitTests': 78, 'archiveTests': 5,
                  'results': results,
                  'limits': ['Record hashes are locally supplied for this check, not independent review.',
                             'Source and package audits do not grant runtime or production qualification.',
                             'Candidate archives and test logs remain local temporary artifacts.']}, indent=2))
