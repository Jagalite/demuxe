#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Prepare, verify and explicitly publish an exact qualified modular handoff."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import base64
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def metadata(path):
    with tarfile.open(path) as tar:
        return json.load(tar.extractfile('package/package.json'))


def validate(directory, tag=None, commit=None):
    record = json.loads((directory / 'modular-verification.json').read_text())
    require(record['schema'] == 1 and record['passed'], 'Unqualified modular release')
    if tag is not None:
        require(tag.startswith('modular-'), 'Publication requires a modular- tag')
        require(record.get('sourceTag') == tag and record.get('sourceCommit') == commit,
                'Modular release does not match the requested tag and commit')
        require(record.get('cleanTaggedSource') is True, 'Publication requires clean tagged source')
    for name, expected in record['files'].items():
        require(Path(name).name == name and not (directory / name).is_symlink(), 'Unsafe release asset')
        require(digest(directory / name) == expected, 'Release asset changed: ' + name)
    qualification = json.loads((directory / record['qualification']).read_text())
    require(qualification['passed'] and qualification['ordinaryQualifiedAssembly']
            and qualification['finalCoreMatchesInstalledTests'], 'Missing ordinary qualified core')
    require(len(qualification['gates']) >= 29
            and len({g['path'] for g in qualification['gates']}) == len(qualification['gates'])
            and len(qualification['packages']) == 11,
            'Incomplete modular qualification')
    require(digest(directory / record['core']) == qualification['coreArchiveSHA256'], 'Core hash mismatch')
    for gate in qualification['gates']:
        evidence = directory / record['evidenceFiles'][gate['path']]
        require(digest(evidence) == gate['sha256'] and json.loads(evidence.read_text())['passed'],
                'Changed or unsuccessful qualification evidence')
    names = set()
    expected_packages = {'demuxe'} | {'@demuxe/provider-' + p['target'] for p in qualification['packages']}
    package_hashes = {'demuxe': qualification['coreArchiveSHA256']} | {
        '@demuxe/provider-' + p['target']: p.get('sha256', p.get('archiveSHA256'))
        for p in qualification['packages']}
    for item in record['packages']:
        path = directory / item['file']
        info = metadata(path)
        require(info['name'] == item['name'] and info['version'] == record['version']
                and not info.get('private') and not info.get('scripts'), 'Invalid publish metadata')
        require(info['name'] not in names, 'Duplicate package')
        names.add(info['name'])
        require(digest(path) == item['sha256'] == package_hashes.get(info['name']), 'Package hash mismatch')
    require(names == expected_packages, 'Missing or unexpected modular packages')
    require(re.fullmatch(r'\d+\.\d+\.\d+-[0-9A-Za-z.-]+', record['version']),
            'This handoff stages prerelease versions only')
    app = qualification['applicationSource']['verification']
    require(app['passed'] and digest(directory / Path(app['archive']).name) == app['sha256'],
            'Application source mismatch')
    rebuilt = qualification.get('applicationSourceRebuild', {})
    require(rebuilt.get('passed') is True and rebuilt.get('sourceSHA256') == app['sha256']
            and rebuilt.get('coreArchiveSHA256') == qualification['coreArchiveSHA256'],
            'Missing matching extracted-source rebuild')
    for companion in app['nativeSourceCompanions']:
        require(digest(directory / companion['filename']) == companion['sha256'], 'Native source mismatch')
    return record


def prepare(report, output, tag=None):
    qualification = json.loads(report.read_text())
    require(qualification['passed'] and qualification.get('ordinaryQualifiedAssembly'), 'Unqualified core')
    output.mkdir(parents=True, exist_ok=True)
    require(not any(output.iterdir()), 'Use a fresh release output directory')
    files = {}

    def retain(path, name=None):
        path = Path(path)
        name = name or path.name
        require(name not in files, 'Duplicate release filename: ' + name)
        shutil.copyfile(path, output / name)
        files[name] = digest(output / name)
        return name

    core = qualification['finalCore']
    if isinstance(core, str):
        core = json.loads(Path(core).read_text())
    core_name = retain(core['archive'])
    packages = [{'file': core_name, **metadata(output / core_name), 'sha256': files[core_name]}]
    source_hashes = {}
    sources = json.loads(Path(core['record']).read_text())['sources']
    source_hashes.update({name: fact['sha256'] for name, fact in sources.items()})
    for package in qualification['packages']:
        name = retain(package['archive'])
        packages.append({'file': name, **metadata(output / name), 'sha256': files[name]})
        inventory = json.loads(Path(package['record']).read_text())
        source_hashes.update({name: fact['sha256'] for name, fact in inventory['sources'].items()})
        source_hashes.update((inventory.get('engineBuildRecord') or {}).get('inputs', {}))
    app = qualification['applicationSource']['verification']
    retain(app['archive'])
    with tarfile.open(app['archive']) as tar:
        source_manifest = json.load(tar.extractfile('application-source-manifest.json'))
        for name, fact in source_manifest['files'].items():
            if not name.startswith(('results/', 'build/', 'web/providers/')):
                source_hashes[name] = fact['sha256']
    for companion in app['nativeSourceCompanions']:
        retain(ROOT / companion['repositoryPath'])
    evidence = {}
    for index, gate in enumerate(qualification['gates']):
        evidence[gate['path']] = retain(ROOT / gate['path'], f'evidence-{index:02d}.json')
    qname = retain(report, 'modular-qualification.json')
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    if tag:
        require(tag.startswith('modular-'), 'Use a modular- tag to keep the monolithic release workflow separate')
        tagged = subprocess.check_output(['git', 'rev-parse', tag + '^{commit}'], cwd=ROOT, text=True).strip()
        require(tagged == commit, 'Requested tag is not checked out')
        # Compare actual release inputs against the tag, including currently
        # untracked inputs. A clean status alone cannot prove source ownership.
        for name, expected in source_hashes.items():
            if name.startswith(('build/', 'web/engine-', 'web/providers/')):
                continue  # linked outputs remain bound to audited native source companions
            data = subprocess.check_output(['git', 'show', commit + ':' + name], cwd=ROOT)
            require(hashlib.sha256(data).hexdigest() == expected, 'Release input differs from tag: ' + name)
    record = {'schema': 1, 'passed': True, 'sourceTag': tag, 'sourceCommit': commit,
              'cleanTaggedSource': bool(tag), 'version': packages[0]['version'], 'core': core_name,
              'qualification': qname, 'packages': packages, 'files': files, 'evidenceFiles': evidence}
    (output / 'modular-verification.json').write_text(json.dumps(record, indent=2) + '\n')
    validate(output, tag, commit) if tag else validate(output)
    print(json.dumps({'passed': True, 'packages': len(packages), 'assets': len(files) + 1,
                      'publishable': bool(tag), 'output': str(output)}, indent=2))


def stage(directory, tag, commit):
    record = validate(directory, tag, commit)
    # Read back the source companions and verification from the public release
    # before staging. npm approval remains the existing final publication step.
    pending = []
    for item in record['packages']:
        path = directory / item['file']
        url = 'https://registry.npmjs.org/' + urllib.parse.quote(item['name'], safe='') + '/' + record['version']
        try:
            with urllib.request.urlopen(url, timeout=60) as response:
                existing = json.load(response)
        except urllib.error.HTTPError as error:
            if error.code != 404:
                raise
        else:
            with path.open('rb') as stream:
                integrity = 'sha512-' + base64.b64encode(hashlib.file_digest(stream, 'sha512').digest()).decode()
            require(existing['dist']['integrity'] == integrity, 'Published version contains different bytes: ' + item['name'])
            print('Already published with matching bytes:', item['name'])
            continue
        pending.append(path)
    # Preflight every version before creating any staged publication.
    for path in pending:
        subprocess.run(['npm', 'stage', 'publish', str(path.resolve()), '--tag', 'beta',
                        '--access', 'public', '--ignore-scripts', '--provenance'], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    p = commands.add_parser('prepare')
    p.add_argument('--qualification', type=Path, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--tag')
    for name in ['verify', 'stage']:
        p = commands.add_parser(name)
        p.add_argument('--assets', type=Path, required=True)
        p.add_argument('--tag', required=True)
        p.add_argument('--commit', required=True)
    args = parser.parse_args()
    if args.command == 'prepare':
        prepare(args.qualification, args.output, args.tag)
    elif args.command == 'verify':
        validate(args.assets, args.tag, args.commit)
        print('Modular release verified')
    else:
        stage(args.assets, args.tag, args.commit)
