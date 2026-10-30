#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Check selected format build inputs against one corresponding-source archive.

This checks exact byte correspondence and archive structure. It does not
independently rebuild a bundle, grant qualification, or approve distribution.
"""
import importlib.util
import io
import json
from pathlib import Path
import tarfile

from license_policy import ROOT, encoded, sha


def read_relative(root, name, limit):
    if not name or name.startswith('/') or '\\' in name or any(part in ('', '.', '..') for part in name.split('/')):
        raise ValueError('Invalid format source path')
    path = root
    for part in name.split('/'):
        path = path / part
        if path.is_symlink():
            raise ValueError('Symlinked format source')
    with path.open('rb') as source:
        data = source.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Format source exceeds byte budget')
    return data


def verify(source_root, report, selected):
    source_root = Path(source_root)
    if any(path.is_symlink() for path in (source_root, *source_root.parents)):
        raise ValueError('Symlinked format source root')
    companion = json.loads(read_relative(source_root, 'source-companion.json', 1024 * 1024))
    provider = json.loads(read_relative(source_root, 'provider-manifest.json', 1024 * 1024))
    artifacts = provider.get('artifacts')
    allowed = {'runtime/web/providers/mediabunny/webm.js', 'runtime/web/providers/mediabunny/mp4.js',
               'runtime/web/providers/mediabunny/mp4-stream.js'}
    if (not isinstance(artifacts, dict) or len(artifacts) != 1 or set(artifacts) - allowed or
            provider.get('package') != '@demuxe/provider-mediabunny' or provider.get('providerContractVersion') != 1):
        raise ValueError('Invalid format source provider manifest')
    for name, digest in artifacts.items():
        if sha(read_relative(source_root, name, 16 * 1024 * 1024)) != digest:
            raise ValueError('Format source provider artifact mismatch')
    identity = 'sha256:' + sha(encoded(artifacts))
    if companion.get('runtimeIdentity') != identity or not provider.get('provides') or any(item.get('implementationIdentity') != identity for item in provider['provides']):
        raise ValueError('Format source provider identity mismatch')
    compressed = read_relative(source_root, companion.get('path'), 128 * 1024 * 1024)
    if len(compressed) != companion.get('bytes') or sha(compressed) != companion.get('sha256'):
        raise ValueError('Format source companion digest mismatch')
    path = ROOT / 'packages/provider-mediabunny/test/source-archive.py'
    spec = importlib.util.spec_from_file_location('format_source_archive', path)
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    with tarfile.open(fileobj=io.BytesIO(compressed), mode='r:gz') as archive:
        entries = module.validate(archive)
        if 'source-manifest.json' not in entries or not entries['source-manifest.json'].isfile():
            raise ValueError('Missing format source inventory')
        manifest = json.load(archive.extractfile(entries['source-manifest.json']))
        if manifest.get('runtimeIdentity') != identity or manifest.get('upstream') != 'mediabunny@1.63.0':
            raise ValueError('Format source inventory identity mismatch')
        facts = manifest.get('files')
        if not isinstance(facts, list) or any(not isinstance(item, dict) or not isinstance(item.get('path'), str) for item in facts):
            raise ValueError('Invalid format source inventory')
        names = [item['path'] for item in facts]
        if len(names) != len(set(names)):
            raise ValueError('Duplicate format source inventory path')
        actual = {name for name, member in entries.items() if member.isfile()} - {'source-manifest.json'}
        if set(names) != actual:
            raise ValueError('Format source inventory differs from archive')
        observed = {}
        for item in facts:
            data = archive.extractfile(entries[item['path']]).read()
            if len(data) != item.get('bytes') or sha(data) != item.get('sha256'):
                raise ValueError('Format source inventory hash mismatch: ' + item['path'])
            observed[item['path']] = (len(data), sha(data))
    builder = observed.get('demuxe-adapter/build-delivery.mjs')
    if not builder or builder[1] != report.get('builderSHA256'):
        raise ValueError('Format builder differs from corresponding source')
    for entry in selected:
        inputs = entry.get('compiledInputs')
        if not isinstance(inputs, list) or not inputs:
            raise ValueError('Missing format compiled inputs: ' + entry['name'])
        seen = set()
        for item in inputs:
            if not isinstance(item, dict) or not isinstance(item.get('path'), str):
                raise ValueError('Invalid format compiled input')
            name = item['path']
            if name in seen or not name.startswith(('demuxe-adapter/', 'upstream/mediabunny/')):
                raise ValueError('Invalid or duplicate format compiled input: ' + name)
            seen.add(name)
            if observed.get(name) != (item.get('bytes'), item.get('sha256')):
                raise ValueError('Format compiled input differs from corresponding source: ' + name)
    return {'sha256': companion['sha256'], 'bytes': companion['bytes'], 'runtimeIdentity': identity}
