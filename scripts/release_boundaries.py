# SPDX-License-Identifier: Apache-2.0
"""Reject partial, stale, or mismatched installed-archive boundary evidence."""
CASES = {
 'preview-success','preview-abort-load','preview-abort-seek','preview-invalid-media',
 'destroy-during-open','destroy-command-burst','hybrid-destroy-during-open',
 'hybrid-destroy-command-burst','software-destroy-during-open','software-destroy-command-burst',
 'network-inspection-cancel','network-auth-cancel','network-auth-success','network-auth-rejected',
 'network-epoch-reuse','network-retry-success','network-representation-change',
 'network-player-open-cancel','network-player-auth-destroy'
}
HARNESS = {'tests/api-stability/'+name+'.mjs' for name in [
 'live-boundaries','live-boundary-scenarios','live-network-scenarios',
 'live-fault-server','live-check-helpers','live-runtime']}


def verify_boundary_receipt(receipt, family, archive_hash, manifest, source_files):
    checks = receipt.get('checks', [])
    if (receipt.get('passed') is not True or receipt.get('negativeControl') is not False
            or receipt.get('scope') != 'Installed-archive live boundary checks'
            or receipt.get('family') != family or not receipt.get('browser')
            or receipt.get('archiveSHA256') != archive_hash
            or receipt.get('sourceCommit') != manifest['sourceCommit']
            or len(checks) != len(CASES) or {r.get('scenario') for r in checks} != CASES
            or any(r.get('passed') is not True or r.get('errors') != [] for r in checks)
            or receipt.get('runtimeFiles') != manifest['files']):
        raise ValueError('Incomplete or mismatched installed boundary qualification')
    hashes = receipt.get('hashes', {})
    for name in HARNESS | {'scripts/serve.mjs', 'fixtures/example.mp4'}:
        expected = source_files.get('demuxe/'+name)
        if not expected or hashes.get(name) != expected:
            raise ValueError('Boundary harness or fixture differs from candidate: '+name)
    for name in ('web/range-reader.js', 'web/generated/sources.js',
                 'web/generated/preview/providers.js', 'web/generated/internal/machine/async-policy.js',
                 'web/generated/internal/machine/preview.js'):
        expected = manifest['files'][name]['sha256']
        if hashes.get(name) != expected or receipt.get('servedHashes', {}).get(name) != expected:
            raise ValueError('Boundary served runtime differs from candidate: '+name)
