#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Shared source and archive licensing rules; no native build is required."""
import fnmatch
import hashlib
import json
import os
import pathlib
import re
import subprocess
import tarfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
APACHE = 'Apache-2.0'
GPL = 'GPL-3.0-or-later'
CC = 'CC-BY-4.0'
CODE = {'.ts', '.js', '.mjs', '.py', '.sh', '.c', '.h', '.inc', '.html', '.css'}
LEGAL = ['LICENSE', 'LICENSES/Apache-2.0.txt', 'LICENSES/GPL-2.0-or-later.txt',
         'LICENSES/GPL-3.0-or-later.txt',
         'LICENSES/CC-BY-4.0.txt', 'LICENSING.md', 'docs/LICENSING.md',
         'docs/MEDIA-NOTICES.md', 'CONTRIBUTING.md', 'licensing/boundaries.json']


def encoded(value):
    return (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def header(data):
    # Only leading comments count, not examples or checker string literals.
    match = re.search(r'SPDX-License-Identifier: ([A-Za-z0-9.+-]+(?: (?:OR|AND|WITH) [A-Za-z0-9.+-]+)*)',
                      '\n'.join(data.decode().splitlines()[:5]))
    return match[1].strip() if match else None


def generated_source(name):
    if not name.startswith('web/generated/'):
        return None
    return 'src/' + re.sub(r'(?:\.d\.ts|\.js)$', '.ts', name[len('web/generated/'):])


class Policy:
    def __init__(self, root=ROOT):
        self.root = pathlib.Path(root)
        self.config = json.loads((self.root / 'licensing/boundaries.json').read_text())
        self.core = set(self.config['coreSources'])

    def classify(self, name):
        if name in self.core:
            return APACHE
        source = generated_source(name)
        if source and (self.root / source).is_file():
            return self.classify(source)
        for rule in self.config['rules']:
            if any(fnmatch.fnmatchcase(name, pattern) for pattern in rule['paths']):
                return rule['license']
        raise ValueError('Unclassified path; add an explicit license boundary: ' + name)

    def paths(self):
        if (self.root / '.git').exists():
            return sorted(set(filter(None, subprocess.check_output(
                ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
                cwd=self.root).decode().split('\0'))))
        # Preferred-source companions have no .git directory. Keep them buildable
        # without accidentally reading the index of a recipient's enclosing repo.
        paths = []
        for directory, folders, files in os.walk(self.root):
            relative = pathlib.Path(directory).relative_to(self.root)
            folders[:] = [name for name in folders if name not in
                          {'.git', 'node_modules', 'build', 'test-results', '__pycache__'}
                          and not (relative == pathlib.Path('web') and
                                   (name == 'engine' or name.startswith('engine-')))
                          and not (relative == pathlib.Path('web/m3') and name in {'engine', 'fixture'})]
            paths.extend(str(relative / name) for name in files if name != '.DS_Store')
        return sorted(paths)

    def check(self):
        errors = []
        for name in self.paths():
            path = self.root / name
            if not path.is_file():
                continue
            try:
                license_id = self.classify(name)
                source = generated_source(name)
                historical = name.startswith('results/') or '/files/' in name
                if (path.suffix in CODE and license_id in [APACHE, GPL]
                        and not historical and not (source and not (self.root / source).is_file())):
                    if header(path.read_bytes()) != license_id:
                        errors.append('Incorrect/missing SPDX header: ' + name)
            except (ValueError, UnicodeError) as error:
                errors.append(str(error))
        for name in self.core:
            if not (self.root / name).is_file():
                errors.append('Missing core source: ' + name)
        for name, digest in self.config['preservedFiles'].items():
            path = self.root / name
            if not path.is_file() or sha(path.read_bytes()) != digest:
                errors.append('Preserved source/notice changed; review provenance: ' + name)
        for item in json.loads((self.root / 'third_party/notices.json').read_text()):
            if sha((self.root / item['noticePath']).read_bytes()) != item['sha256']:
                errors.append('Third-party notice hash mismatch: ' + item['noticePath'])
        for name in LEGAL:
            if not (self.root / name).is_file():
                errors.append('Missing license material: ' + name)
        for name, digest in self.config['licenseTextSHA256'].items():
            if sha((self.root / name).read_bytes()) != digest:
                errors.append('License text changed: ' + name)
        project = json.loads((self.root / 'package.json').read_text())
        core = json.loads((self.root / 'packages/core/package.json').read_text())
        lock = json.loads((self.root / 'package-lock.json').read_text())
        if project.get('license') != GPL or lock['packages'][''].get('license') != GPL:
            errors.append('The complete player package must be GPL-3.0-or-later')
        if project.get('demuxeLicenses') != self.config['packageLicenses']:
            errors.append('Root component license metadata differs from the boundary map')
        if core.get('license') != APACHE or not core.get('private'):
            errors.append('Core source manifest must be private and Apache-2.0 licensed')
        if core['version'] != project['version']:
            errors.append('Core and player versions must match')
        if errors:
            raise ValueError('\n'.join(errors))

    def core_files(self):
        names = set(self.core)
        for name in self.core:
            if name.startswith('src/') and name.endswith('.ts'):
                base = 'web/generated/' + name[4:-3]
                names.update([base + '.js', base + '.d.ts'])
        return names

    def stamp_generated(self):
        for path in (self.root / 'web/generated').rglob('*'):
            name = str(path.relative_to(self.root))
            source = generated_source(name)
            if path.is_file() and source and (self.root / source).is_file():
                text = path.read_text()
                expected = self.classify(source)
                if header(text.encode()) != expected:
                    # tsc does not retain ordinary leading comments in declarations.
                    if header(text.encode()):
                        raise ValueError('Conflicting generated SPDX header: ' + name)
                    path.write_text('// SPDX-License-Identifier: ' + expected + '\n' + text)

    def package_map(self, files, kind):
        items = {}
        for name, data in sorted(files.items()):
            if name == 'license-map.json':
                continue
            if name in ['index.js', 'index.d.ts', 'player.js', 'player.d.ts']:
                license_id = GPL
            elif name in ['package.json', 'LICENSE']:
                license_id = APACHE if kind == 'core' else GPL
            elif name.startswith('web/engine-'):
                # These are linked builds; component notices still apply.
                license_id = GPL
            elif name == 'engine-build.json':
                license_id = CC
            else:
                license_id = self.classify(name)
            items[name] = {'license': license_id, 'sha256': sha(data)}
        return {'schema': 1, 'package': kind, 'files': items,
                'thirdPartyTerms': 'Retained notices and docs/MEDIA-NOTICES.md take precedence for third-party portions.'}

    def check_package(self, files, kind):
        metadata = json.loads(files['package.json'])
        expected = APACHE if kind == 'core' else GPL
        if metadata.get('license') != expected:
            raise ValueError('Incorrect package license: ' + str(metadata.get('license')))
        required = set(LEGAL) | {'README.md', 'license-map.json'}
        if missing := required - files.keys():
            raise ValueError('Missing packaged license material: ' + ', '.join(sorted(missing)))
        for name in LEGAL:
            original = 'packages/core/LICENSE' if kind == 'core' and name == 'LICENSE' else name
            if files[name] != (self.root / original).read_bytes():
                raise ValueError('Packaged license material differs: ' + name)
        # The release manifest hashes this map; do not create a circular hash.
        mapped = {k: v for k, v in files.items() if k != 'release-manifest.json'}
        if json.loads(files['license-map.json']) != self.package_map(mapped, kind):
            raise ValueError('Package license map differs from actual contents')
        if kind == 'core':
            allowed = self.core_files() | required | {'package.json'}
            if extra := files.keys() - allowed:
                raise ValueError('Non-core content in reusable package: ' + ', '.join(sorted(extra)))
            if missing := self.core_files() - files.keys():
                raise ValueError('Missing core package source/output: ' + ', '.join(sorted(missing)))
            if metadata.get('name') != 'demuxe-core' or any(metadata.get(k) for k in
                    ['dependencies', 'optionalDependencies', 'peerDependencies', 'bundledDependencies', 'bin', 'scripts']):
                raise ValueError('Core must not acquire runtime dependencies, scripts or player executables')
            template = json.loads((self.root / 'packages/core/package.json').read_text())
            if metadata.get('exports') != template['exports']:
                raise ValueError('Core export boundary differs from the reviewed manifest')
            template.pop('private')
            template.pop('scripts')
            if metadata != template:
                raise ValueError('Core package metadata differs from the reviewed manifest')
            for name in self.core_files():
                if self.classify(name) != APACHE or header(files[name]) != APACHE:
                    raise ValueError('Non-Apache core module: ' + name)
                if files[name] != (self.root / name).read_bytes():
                    raise ValueError('Packaged core module differs from source: ' + name)
        else:
            if metadata.get('demuxeLicenses') != self.config['packageLicenses']:
                raise ValueError('Missing/incorrect player component license metadata')
            if 'engine-build.json' in files:
                licenses = json.loads(files['engine-build.json']).get('licenses', {})
                for name in ['hybrid', 'software', 'remuxWrapper']:
                    if licenses.get(name) != GPL:
                        raise ValueError('Combined engine license must be GPL-3.0-or-later: ' + name)
                if licenses.get('remuxFFmpegLibrary') != 'LGPL-2.1-or-later':
                    raise ValueError('The remux FFmpeg library must retain its LGPL grant')
            for path in (self.root / 'third_party').rglob('*'):
                if path.is_file():
                    name = str(path.relative_to(self.root))
                    if files.get(name) != path.read_bytes():
                        raise ValueError('Missing/changed packaged third-party notice: ' + name)
            for name in ['fixtures/FONT-LICENSE.txt', 'fixtures/DejaVuSans.ttf']:
                if files.get(name) != (self.root / name).read_bytes():
                    raise ValueError('Missing/changed font attribution or asset: ' + name)


def archive_files(path):
    files = {}
    with tarfile.open(path) as archive:
        for member in archive:
            name = pathlib.PurePosixPath(member.name)
            if not member.isfile() or name.is_absolute() or '..' in name.parts or name.parts[0] != 'package':
                raise ValueError('Unexpected package archive entry: ' + member.name)
            relative = str(name.relative_to('package'))
            if relative in files:
                raise ValueError('Duplicate package entry: ' + relative)
            files[relative] = archive.extractfile(member).read()
    return files
