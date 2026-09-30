#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Audit an exact provider/core npm tarball against a pinned build inventory.

Does not build, extract, install or publish. The inventory must come from reviewed
build tooling: its input closure is evidence, not guessed from minified strings.
Unknown source ownership/licenses fail closed. Compilation and media qualification
remain separate gates; this audit does not infer a build closure from archive bytes.
"""
import argparse
import fnmatch
import hashlib
import json
from pathlib import Path, PurePosixPath
import tarfile

from license_policy import Policy, ROOT, generated_source
from audio_source_policy import verify_audio_engine_source


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(name):
    path = PurePosixPath(name)
    if not name or name == '.' or '\\' in name or any(ord(c) < 32 for c in name) or path.is_absolute() or '..' in path.parts or path.as_posix() != name:
        raise ValueError('Non-canonical archive/input path: ' + name)
    return name


def archive_files(path):
    files = {}
    total = 0
    count = 0
    with tarfile.open(path, 'r:*') as archive:
        for entry in archive:
            count += 1
            if count > 20000:
                raise ValueError('Archive entry budget exceeded')
            if entry.isdir():
                safe_path(entry.name.rstrip('/'))
                if entry.name.rstrip('/') != 'package' and not entry.name.startswith('package/'):
                    raise ValueError('Archive directory is outside package/')
                continue
            if not entry.isreg() or not entry.name.startswith('package/'):
                raise ValueError('Only regular package files are permitted: ' + entry.name)
            name = safe_path(entry.name[len('package/'):])
            if name in files:
                raise ValueError('Duplicate package entry: ' + name)
            total += entry.size
            if entry.size < 0 or entry.size > 256 * 1024 * 1024 or total > 512 * 1024 * 1024:
                raise ValueError('Archive byte budget exceeded')
            stream = archive.extractfile(entry)
            if stream is None:
                raise ValueError('Unreadable package entry: ' + name)
            with stream:
                data = stream.read(entry.size + 1)
            if len(data) != entry.size:
                raise ValueError('Archive size mismatch: ' + name)
            files[name] = data
    return files


def owner(path, config, policy):
    source = generated_source(path) or path
    for rule in config['ownershipRules']:
        if any(fnmatch.fnmatchcase(source, pattern) for pattern in rule['paths']):
            return rule['owner']
    if source in policy.core:
        return 'core'
    raise ValueError('Unclassified distribution ownership: ' + source)


def local_file(path):
    safe_path(path)
    candidate = ROOT / path
    current = ROOT
    for part in PurePosixPath(path).parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('Symlinked build input: ' + path)
    if not candidate.resolve().is_relative_to(ROOT.resolve()):
        raise ValueError('Build input escapes repository: ' + path)
    return candidate


def local_bytes(path):
    candidate = local_file(path)
    if candidate.stat().st_size > 256 * 1024 * 1024:
        raise ValueError('Individual build input exceeds byte budget')
    return candidate.read_bytes()


def local_sha(path):
    digest = hashlib.sha256()
    with local_file(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def verify_corresponding_source(companion, engine, record, profile):
    """Inspect the companion itself, not only a self-declared archive hash."""
    observed = {}; source_manifest = None; native_record = None; total = 0
    with tarfile.open(local_file(companion['repositoryPath']), 'r|gz') as archive:
        for entry in archive:
            safe_path(entry.name)
            if not entry.isreg() or entry.name in observed or len(observed)>20000:
                raise ValueError('Invalid corresponding-source archive entry')
            total += entry.size
            if entry.size>256*1024*1024 or total>1024*1024*1024:
                raise ValueError('Corresponding-source archive exceeds budget')
            stream=archive.extractfile(entry)
            data=stream.read();observed[entry.name]=sha(data)
            if entry.name=='source-manifest.json':source_manifest=json.loads(data)
            if entry.name=='engine-build.json':native_record=json.loads(data)
    if not source_manifest or native_record!=engine:
        raise ValueError('Missing or mismatched source engine evidence')
    observed.pop('source-manifest.json',None)
    if observed!=source_manifest['files']:
        raise ValueError('Corresponding-source inventory differs from archive bytes')
    excluded=set(profile.get('excludedSourceConfigurations', []))
    if set(source_manifest.get('excludedConfigurations',[]))!=excluded:
        raise ValueError('Unreviewed native configuration exclusion')
    for group,prefix in [('inputs','demuxe/'),('sdkSources','toolchain/emscripten/'),('configurations','build-materials/')]:
        for path,digest in engine[group].items():
            if group=='configurations' and path in excluded:continue
            if observed.get(prefix+path)!=digest:raise ValueError('Missing matching preferred source/configuration: '+path)
    for name,digest in engine['sources'].items():
        if observed.get('demuxe/build/downloads/'+name+'.tar.gz')!=digest:raise ValueError('Missing locked upstream source: '+name)
    for path in profile['engines']:
        packed='runtime/'+path
        if record['files'][packed]['sha256']!=engine['artifacts'][path]['sha256']:
            raise ValueError('Packaged engine differs from native build record: '+path)
    for name,item in record['files'].items():
        if (name.startswith('runtime/') or name.startswith('dist/')) and name[len('runtime/'):] not in profile['engines']:
            for source in item['inputs']:
                if observed.get('application/'+source)!=record['sources'][source]['sha256']:
                    raise ValueError('Missing matching application source: '+source)


def audit(target, files, record):
    policy = Policy()
    config = json.loads((ROOT / 'licensing/provider-packages.json').read_text())
    spec = config['targets'][target]
    if spec.get('native', True) and target != 'core':verify_audio_engine_source(target, record.get('engineBuildRecord'))
    if record.get('schema') != 1 or record.get('target') != target:
        raise ValueError('Build inventory target/schema mismatch')
    if set(files) != set(record['files']):
        raise ValueError('Packed file set differs from the reviewed build inventory')
    if set(spec['requiredFiles']) - set(files):
        raise ValueError('Required package/license/build material is missing')
    metadata = json.loads(files['package.json'])
    template = json.loads((ROOT / spec['template']).read_text())
    template.pop('private', None)
    template.pop('scripts', None)
    if metadata != template or metadata.get('name') != spec['npmName']:
        raise ValueError('Package metadata differs from reviewed publish template')
    if any(metadata.get(k) for k in ['scripts', 'bundledDependencies', 'bundleDependencies']):
        raise ValueError('Install/pack scripts or bundled dependencies are forbidden')
    if target == 'core' and any(metadata.get(k) for k in ['dependencies', 'optionalDependencies', 'peerDependencies']):
        raise ValueError('Core must not acquire provider dependencies')
    exports = []

    def visit(value):
        if isinstance(value, dict):
            for child in value.values():
                visit(child)
        elif isinstance(value, str):
            if not value.startswith('./') or '*' in value:
                raise ValueError('Only explicit package-local exports are permitted')
            exports.append(safe_path(value[2:]))
        else:
            raise ValueError('Unsupported package export declaration')

    visit(metadata['exports'])
    if set(exports) - set(files):
        raise ValueError('Package exports missing artifacts')
    license_map = json.loads(files['license-map.json'])
    if set(license_map) != set(files):
        raise ValueError('License map must cover the exact archive')
    source_cache = {}
    for name, data in files.items():
        item = record['files'][name]
        if sha(data) != item['sha256']:
            raise ValueError('Artifact hash mismatch: ' + name)
        licenses = set(item['licenses'])
        if not licenses or licenses - set(spec['licenses']) or set(license_map[name]) != licenses:
            raise ValueError('Unapproved or mismatched artifact licenses: ' + name)
        # Core source maps can embed provider source despite permissive wrappers.
        # Keep them out until a dedicated map/input-content audit is implemented.
        if target == 'core' and name.endswith('.map'):
            raise ValueError('Core source maps are not approved for distribution')
        if not item['inputs']:
            raise ValueError('Artifact has no provenance closure: ' + name)
        input_licenses = set()
        for source in item['inputs']:
            source_record = record['sources'][source]
            if source not in source_cache:
                source_cache[source] = local_bytes(source)
            source_bytes = source_cache[source]
            if sha(source_bytes) != source_record['sha256']:
                raise ValueError('Build input hash mismatch: ' + source)
            if item.get('kind') == 'notice':
                notice = config['retainedNotices'].get(name)
                if not notice or source != notice['source'] or notice['sha256'] != sha(data) or data != source_bytes:
                    raise ValueError('Notice is not an exact retained license text: ' + name)
                if notice['license'] not in spec['licenses']:
                    raise ValueError('Non-core license material in Apache core: ' + source)
                input_licenses.add(notice['license'])
                continue
            if source == spec['template'] or source == 'licensing/provider-packages.json':
                if item.get('kind') != 'metadata' or not name.endswith('.json'):
                    raise ValueError('Package metadata cannot provide code provenance')
                source_owner, source_license = 'core', 'Apache-2.0'
            else:
                source_owner, source_license = owner(source, config, policy), policy.classify(source)
            if source_owner not in spec['owners']:
                raise ValueError('Provider-owned input crosses package boundary: ' + source)
            if source_license not in spec['licenses']:
                raise ValueError('Input license is not approved for target: ' + source)
            input_licenses.add(source_license)
        if input_licenses - licenses:
            raise ValueError('Artifact license map omits input obligations: ' + name)
        if name.endswith(('.js', '.mjs', '.wasm')) and item.get('kind') != 'code':
            raise ValueError('Executable artifact mislabeled as metadata/notice: ' + name)
    if target != 'core':
        manifest = json.loads(files['provider-manifest.json'])
        if spec.get('native', True):
            engine = json.loads(files['engine-build.json'])
            companion = json.loads(files['source-companion.json'])
            if engine != record.get('engineBuildRecord'):
                raise ValueError('Engine evidence differs from reviewed build inventory')
            # Bind source and all companion bytes explicitly; a URL/name alone is
            # not matching source/relink evidence. Existing engine verifiers remain
            # a separate mandatory release gate, not replaced by this tarball audit.
            if local_sha(companion['repositoryPath']) != companion['sha256'] or companion != record.get('sourceCompanion'):
                raise ValueError('Provider source companion differs')
            verify_corresponding_source(companion, engine, record, config['profiles'][target])
        if manifest.get('package') != spec['npmName'] or manifest.get('version') != metadata['version'] or manifest.get('providerContractVersion') != 1:
            raise ValueError('Provider manifest identity/contract mismatch')
        if manifest.get('compatibleCore') != metadata.get('peerDependencies', {}).get('demuxe'):
            raise ValueError('Provider/core compatibility declarations differ')
        if not manifest.get('provides') or not manifest.get('artifacts'):
            raise ValueError('Provider manifest has no capabilities/assets')
        if set(manifest['artifacts'])!={name for name in files if name.startswith('runtime/')}:
            raise ValueError('Provider manifest must bind every runtime artifact')
        identity='sha256:'+sha((json.dumps(manifest['artifacts'],indent=2,sort_keys=True)+'\n').encode())
        if any(p['implementationIdentity']!=identity for p in manifest['provides']):
            raise ValueError('Provider identity does not bind its runtime asset set')
        for path, digest in manifest['artifacts'].items():
            if path not in files or sha(files[path]) != digest:
                raise ValueError('Provider manifest artifact mismatch: ' + path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', choices=list(json.loads((ROOT/'licensing/provider-packages.json').read_text())['targets']), required=True)
    parser.add_argument('--archive', type=Path, required=True)
    parser.add_argument('--record', type=Path, required=True)
    parser.add_argument('--record-sha256', required=True, help='Reviewed build inventory hash, supplied by release tooling')
    args = parser.parse_args()
    raw = args.record.read_bytes()
    if sha(raw) != args.record_sha256:
        raise SystemExit('Reviewed build inventory hash mismatch')
    try:
        audit(args.target, archive_files(args.archive), json.loads(raw))
    except (ValueError, KeyError, TypeError, OSError, tarfile.TarError) as error:
        raise SystemExit(str(error)) from error
    print('Exact package ownership, license map, provenance and metadata verified')


if __name__ == '__main__':
    main()
