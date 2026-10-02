#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Install a distinct provenance-bound private Software candidate in a fresh root."""
import argparse
import hashlib
import importlib.util
import json
import re
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def retained_lease_version(record):
    version = record.get('retainedLeaseVersion', 0)
    if type(version) is not int or version not in (0, 1):
        raise ValueError('Unsupported retained frame lease version')
    if record.get('retainedLeaseTests'):
        raise ValueError('Diagnostic retained lease test exports cannot be installed')
    return version


def verify_retained_lease_abi(record, audit):
    version = retained_lease_version(record)
    advertised = any(item.get('module') == 'demuxe_decoder' and
                     item.get('name') == 'demuxe_decoder_release_v1' and
                     item.get('kind') == 'function' for item in audit['imports'])
    if advertised != bool(version):
        raise ValueError('Retained frame lease record and native ABI disagree')
    if any(item.get('name', '').startswith('demuxe_test_lease_') for item in audit['exports']):
        raise ValueError('Diagnostic retained lease test exports cannot be installed')


def install(build, runtime_root):
    record = json.loads((build / 'build.json').read_text())
    if record.get('status') != 'built_candidate_only' or record.get('dependencyProfile') not in ('playback','playback-full'):
        raise ValueError('Successful private playback build required')
    lease_version = retained_lease_version(record)
    deps = Path(record['dependencyPath'])
    if digest(deps / 'build-result.json') != record['dependencyRecordSHA256']:
        raise ValueError('Playback dependency record drift')
    spec = importlib.util.spec_from_file_location('private_provenance', ROOT / 'experiments/jspi-asyncify/mpv/scripts/provenance.py')
    provenance = importlib.util.module_from_spec(spec);spec.loader.exec_module(provenance)
    dependency = json.loads((deps / 'build-result.json').read_text())
    provenance.verify_dependencies(deps, Path(dependency['toolchain']['sdk']))
    if dependency['profile'] != record['dependencyProfile']:
        raise ValueError('Wrong playback dependency profile')
    for name, wanted in record['adaptedSourceSHA256'].items():
        if digest(build / 'inputs' / name) != wanted:
            raise ValueError('Playback link input drift: ' + name)
    for name, wanted in record.get('adaptedDependencySourceSHA256', {}).items():
        if digest(build / 'inputs' / name) != wanted:
            raise ValueError('Playback adapted dependency input drift: ' + name)
    names = ['playback.mjs', 'playback.wasm', 'playback.asyncify.wasm']
    for name in names:
        if digest(build / name) != record['artifacts'][name]:
            raise ValueError('Playback artifact drift: ' + name)
    config = (deps / 'objects/ffmpeg/config_components.h').read_text()
    decoders = sorted(name.lower() for name in re.findall(r'^#define CONFIG_(\w+)_DECODER 1$', config, re.M))
    filters = sorted(name.lower() for name in re.findall(r'^#define CONFIG_(\w+)_FILTER 1$', config, re.M))
    applied = {Path(c['argv'][-1]).name for c in dependency['commands'] if c.get('returncode') == 0 and c['argv'][0] == 'patch'}
    features = [name for patch,name in [('0019-demux-seek-refresh-reset.patch','track-switch-seek'),('zimg-gamma-lut.patch','gamma-lut')] if patch in applied]
    if 'gamma-lut' in features and 'ToLinearLutOperationWasm' in (deps / 'inputs/experiments/jspi-asyncify/mpv/patches/zimg-gamma-lut.patch').read_text():
        features.append('inverse-gamma-lut')
    targets = [runtime_root / 'web' / ('engine-mpv-playback-' + backend) for backend in ('jspi', 'asyncify')]
    if any(target.exists() for target in targets):
        raise ValueError('Refusing to replace installed playback assets')
    auditor = build / 'inputs/experiments/jspi-asyncify/scripts/audit-wasm.mjs'
    for backend in ('jspi', 'asyncify'):
        audited = subprocess.run(['node', str(auditor), str(build / ('playback.asyncify.wasm' if backend == 'asyncify' else 'playback.wasm')), *(['--asyncify'] if backend == 'asyncify' else [])], check=True, capture_output=True)
        verify_retained_lease_abi(record, json.loads(audited.stdout))
    for backend, target in zip(('jspi', 'asyncify'), targets):
        target.mkdir(parents=True)
        sources = {'player.mjs': 'playback.mjs', 'player.wasm': 'playback.asyncify.wasm' if backend == 'asyncify' else 'playback.wasm'}
        for dest, source in sources.items():
            shutil.copyfile(build / source, target / dest)
        (target / 'manifest.json').write_text(json.dumps({
            'schema': 1, 'backend': backend, 'profile': 'playback',
            'codecProfile': record['dependencyProfile'],
            'decoders': decoders, 'filters': filters, 'features': features,
            'maxHeapBytes': record.get('maxHeapBytes', 134217728),
            'audioCapacity': record.get('audioCapacity', 8192),
            'retainedDecoder': bool(record.get('retainedDecoder')),
            'retainedLeaseVersion': lease_version,
            'traceLogs': bool(record.get('traceLogs')),
            'buildRecordSHA256': digest(build / 'build.json'),
            'files': {dest: digest(build / source) for dest, source in sources.items()},
            'qualification': 'Experimental finite Software candidate; public qualification pending',
        }, indent=2) + '\n')
        print(target)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--build', type=Path, required=True)
    parser.add_argument('--runtime-root', type=Path, required=True)
    args = parser.parse_args()
    install(args.build.resolve(), args.runtime_root.resolve())
