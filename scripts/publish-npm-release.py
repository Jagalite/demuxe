#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Stage the exact qualified beta attached to a published GitHub Release.

This checks the release handoff; it does not replace verify-beta-release.py.
"""
import argparse
import base64
import hashlib
import json
import pathlib
import re
import subprocess
import tarfile
import urllib.error
import urllib.request

REGISTRY = 'https://registry.npmjs.org'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path, algorithm='sha256'):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, algorithm).hexdigest()


def asset(directory, name):
    require(isinstance(name, str) and name not in ('', '.', '..') and
            pathlib.PurePosixPath(name).name == name and '\\' not in name,
            'Invalid release asset name')
    path = directory / name
    require(path.is_file() and not path.is_symlink(), f'Missing release asset: {name}')
    return path


def read_json(tar, name):
    member = tar.getmember(name)
    require(member.isfile(), f'Not a regular archive member: {name}')
    return json.load(tar.extractfile(member))


def validate(directory, tag, commit):
    record = json.loads(asset(directory, 'verification.json').read_text())
    require(record.get('status') == 'developer-beta-candidate-tested', 'Release is not qualified')
    require(record.get('sourceTag') == tag and record.get('sourceCommit') == commit,
            'Verification does not match the checked-out release tag')
    runtime = asset(directory, record['runtime']['file'])
    source = asset(directory, record['source']['file'])
    for kind, path in [('runtime', runtime), ('source', source)]:
        require(digest(path) == record[kind]['sha256'], f'{kind} archive hash mismatch')
    evidence = record.get('tests', [])
    require(evidence and all(re.fullmatch(r'[0-9a-f]{64}', item.get('sha256', ''))
                             for item in evidence), 'Missing verification evidence hashes')
    suites = {item.get('suite') for item in evidence}
    require({'lgpl-complete-readme-catalogue', 'public-api-component-cli-exports-typescript',
             'range-reader-deadline'} <= suites, 'Missing release qualification suites')
    for family in ('chrome', 'firefox'):
        require(sum(item.get('browser') == family and not item.get('suite') and
                    item.get('cases', 0) > 0 for item in evidence) == 2,
                f'Missing {family} consumer/streaming qualification')
    with tarfile.open(runtime) as tar:
        members = tar.getmembers()
        names = [member.name for member in members]
        require(len(names) == len(set(names)), 'Duplicate archive members')
        require(all(member.isfile() or member.isdir() for member in members),
                'Runtime archive contains links or special files')
        require(all(name.startswith('package/') and '..' not in pathlib.PurePosixPath(name).parts
                    for name in names), 'Unsafe runtime archive member')
        package = read_json(tar, 'package/package.json')
        manifest = read_json(tar, 'package/release-manifest.json')
        require(package.get('name') == 'demuxe' and not package.get('private'), 'Wrong/private package')
        version = package['version']
        require(re.fullmatch(r'\d+\.\d+\.\d+-[0-9A-Za-z.-]+', version),
                'Only prerelease versions may use the beta publishing workflow')
        require(manifest.get('version') == version and manifest.get('dirtySource') is False and
                manifest.get('sourceTag') == tag and manifest.get('sourceCommit') == commit,
                'Runtime metadata does not match verified tagged source')
        require(manifest['sourceArchive']['filename'] == source.name and
                manifest['sourceArchive']['sha256'] == record['source']['sha256'],
                'Runtime source companion mismatch')
        actual_files = {member.name.removeprefix('package/') for member in members if member.isfile()}
        require(actual_files == set(manifest['files']) | {'release-manifest.json'},
                'Runtime inventory mismatch')
        for name, expected in manifest['files'].items():
            with tar.extractfile('package/' + name) as stream:
                require(hashlib.file_digest(stream, 'sha256').hexdigest() == expected['sha256'],
                        f'Runtime file hash mismatch: {name}')
            if name.startswith('web/engine-') and name.endswith('/manifest.json'):
                optional = read_json(tar, 'package/' + name)
                if companion := optional.get('sourceCompanion'):
                    require(digest(asset(directory, companion['filename'])) == companion['sha256'],
                            'Optional source companion mismatch')
        if manifest.get('optionalQualificationRequired'):
            require('optional-runtime-exact-archive' in suites, 'Missing optional runtime qualification')
        if manifest.get('adaptiveStreaming'):
            require({item.get('browser') for item in evidence
                     if item.get('suite') == 'shaka-exact-archive'} == {'chrome', 'firefox'},
                    'Missing Shaka qualification')
    with tarfile.open(source) as tar:
        source_manifest = read_json(tar, 'source-manifest.json')
        require(source_manifest.get('sourceTag') == tag and source_manifest.get('sourceCommit') == commit,
                'Source companion revision mismatch')
    return runtime, version


def registry_version(version):
    try:
        with urllib.request.urlopen(f'{REGISTRY}/demuxe/{version}', timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        if error.code == 404:
            return None
        raise


def check_registry(metadata, archive):
    require(metadata['dist']['integrity'] == 'sha512-' + base64.b64encode(
        bytes.fromhex(digest(archive, 'sha512'))).decode(),
        'Registry version already exists with different archive bytes')


def stage(archive, version):
    existing = registry_version(version)
    if existing is not None:
        check_registry(existing, archive)
        print(f'demuxe@{version} already contains the verified bytes; leaving dist-tags unchanged')
        return
    # OIDC permits stage publish, not stage list/view/approve. A pending-stage
    # conflict must fail for a maintainer to inspect; never fall back to publish.
    subprocess.run(['npm', 'stage', 'publish', str(archive.resolve()), '--tag', 'beta',
                    '--access', 'public', '--ignore-scripts', '--provenance',
                    '--registry', REGISTRY], check=True)
    print(f'Staged demuxe@{version} for beta; awaiting maintainer approval with 2FA '
          'in npm Staged Packages. This version is not publicly available yet.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--assets', type=pathlib.Path, required=True)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--stage', action='store_true', help='Stage for human approval after validation (default: validate only)')
    args = parser.parse_args()
    archive, version = validate(args.assets, args.tag, args.commit)
    print(f'Validated demuxe@{version}: {archive.name} ({digest(archive)})')
    if args.stage:
        stage(archive, version)


if __name__ == '__main__':
    main()
