#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exact local MediaBunny candidate package/source inventory, not release approval.

Upstream source bytes are bound through the reviewed source-archive digest;
Demuxe adapter files inside that archive must also match this checkout. Runtime
rebuild and browser qualification remain independent evidence gates.
"""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

from license_policy import CODE, Policy, ROOT, header, sha

TARGET = 'mediabunny-candidate'
AUDIT_INPUTS = (
    'scripts/audit-provider-package.py',
    'scripts/mediabunny_package_audit.py',
    'scripts/record-mediabunny-candidate.py',
    'scripts/package-provider.py',
    'scripts/license_policy.py',
    'licensing/provider-packages.json',
    'licensing/boundaries.json',
)


def local_bytes(name):
    if not name or '\\' in name or any(part in ('', '.', '..') for part in name.split('/')):
        raise ValueError('Invalid local source path')
    path = ROOT
    for part in name.split('/'):
        path = path / part
        if path.is_symlink():
            raise ValueError('Symlinked source input: ' + name)
    if not path.is_file() or path.stat().st_size > 128 * 1024 * 1024:
        raise ValueError('Missing or excessive source input: ' + name)
    return path.read_bytes()


def expected_sources(files):
    companion = json.loads(files['source-companion.json'])
    path = companion['path']
    if path not in files:
        raise ValueError('Missing corresponding-source archive')
    compressed = files[path]
    if len(compressed) > 128 * 1024 * 1024 or len(compressed) != companion['bytes'] or sha(compressed) != companion['sha256']:
        raise ValueError('Corresponding-source archive digest or size mismatch')
    module_path = ROOT / 'packages/provider-mediabunny/test/source-archive.py'
    spec = importlib.util.spec_from_file_location('mediabunny_source_archive', module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    local = {}; policy = Policy()
    approved = set(json.loads(files['license-map.json'])[path])
    with tarfile.open(fileobj=io.BytesIO(compressed), mode='r:gz') as archive:
        entries = module.validate(archive)
        for name, member in entries.items():
            if not member.isfile() or not name.startswith('demuxe-adapter/'):
                continue
            repo_path = 'packages/provider-mediabunny/' + name[len('demuxe-adapter/'):]
            data = archive.extractfile(member).read()
            if local_bytes(repo_path) != data:
                raise ValueError('Archived adapter differs from local source: ' + repo_path)
            license_id = policy.classify(repo_path)
            if license_id not in approved:
                raise ValueError('Source archive license map omits obligation: ' + repo_path)
            if Path(repo_path).suffix in CODE and license_id == 'Apache-2.0' and header(data) != license_id:
                raise ValueError('Archived Apache source lacks matching SPDX header: ' + repo_path)
            local[repo_path] = sha(data)
    for name in AUDIT_INPUTS:
        local[name] = sha(local_bytes(name))
    return dict(sorted(local.items())), companion


def audit(files, record):
    total = 0
    if len(files) > 20000:
        raise ValueError('Candidate package entry budget exceeded')
    for name, data in files.items():
        if (not name or name.startswith('/') or '\\' in name or
                any(ord(char) < 32 or ord(char) == 127 for char in name) or
                any(part in ('', '.', '..') for part in name.split('/'))):
            raise ValueError('Invalid candidate package path: ' + repr(name))
        if not isinstance(data, bytes) or len(data) > 128 * 1024 * 1024:
            raise ValueError('Invalid or excessive candidate package file')
        total += len(data)
    if total > 512 * 1024 * 1024:
        raise ValueError('Candidate package byte budget exceeded')
    config = json.loads(local_bytes('licensing/provider-packages.json'))
    target = config['targets'][TARGET]
    if (target.get('candidateOnly') is not True or target.get('auditKind') != 'mediabunny-corresponding-source-v1' or
            set(target.get('licenses', [])) != {'Apache-2.0', 'MPL-2.0', 'CC-BY-4.0'} or
            target.get('npmName') != '@demuxe/provider-mediabunny'):
        raise ValueError('MediaBunny candidate audit policy differs')
    template = json.loads(local_bytes('packages/provider-mediabunny/package.json'))
    metadata = json.loads(files['package.json'])
    expected = {'name': template['name'], 'version': template['version'], 'private': True,
                'type': 'module', 'peerDependencies': {'demuxe': template['version']}}
    if metadata != expected:
        raise ValueError('MediaBunny candidate metadata differs from private template')
    if set(record) != {'schema', 'target', 'files', 'sources', 'sourceCompanion'}:
        raise ValueError('Unexpected MediaBunny candidate inventory fields')
    if record.get('schema') != 1 or record.get('target') != TARGET:
        raise ValueError('MediaBunny candidate inventory target/schema mismatch')
    if record.get('files') != {name: sha(data) for name, data in sorted(files.items())}:
        raise ValueError('MediaBunny candidate file inventory differs')
    local, companion = expected_sources(files)
    if record.get('sources') != local or record.get('sourceCompanion') != companion:
        raise ValueError('MediaBunny candidate source inventory differs')
    # Reuse the existing complete candidate checker over exactly the bytes from
    # the supplied package archive. It also verifies licenses, manifest, asset
    # closure and the bounded corresponding-source inventory.
    with tempfile.TemporaryDirectory(prefix='demuxe-provider-audit-') as temp:
        root = Path(temp)
        for name, data in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        result = subprocess.run(['node', str(ROOT / 'packages/provider-mediabunny/audit-candidate.mjs'), str(root)],
                                cwd=ROOT, capture_output=True, text=True, timeout=120, check=False)
        if result.returncode:
            raise ValueError('MediaBunny candidate audit failed: ' + result.stderr[-4000:])
    return {'status': 'candidate-package-and-source-audit-passed-not-release',
            'sources': len(local), 'files': len(files)}


def record(files):
    local, companion = expected_sources(files)
    return {'schema': 1, 'target': TARGET,
            'files': {name: sha(data) for name, data in sorted(files.items())},
            'sources': local, 'sourceCompanion': companion}
