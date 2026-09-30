#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build and audit the full Apache Player core from reviewed source inputs.

This is a local package artifact, not a release or provider qualification. Native
and optional services still use the existing deployment layout and route policy.
"""
import argparse
import gzip
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile

from license_policy import ROOT, encoded, sha

spec = importlib.util.spec_from_file_location('provider_audit', ROOT / 'scripts/audit-provider-package.py')
auditor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auditor)


def assemble():
    compiled = json.loads(subprocess.check_output(['node', 'scripts/compile-player-package.mjs'], cwd=ROOT))
    record = {'schema': 1, 'target': 'core', 'sources': compiled['sources'], 'files': {},
              'build': {'compiler': 'typescript', 'version': compiled['compiler'],
                        'inputs': {name: sha((ROOT / name).read_bytes()) for name in
                                   ['scripts/compile-player-package.mjs', 'scripts/package-player-core.py',
                                    'tsconfig.json', 'package-lock.json', 'licensing/provider-packages.json']}}}
    files = {}

    def add(name, data, inputs, kind='code'):
        files[name] = data
        record['files'][name] = {'sha256': sha(data), 'inputs': inputs, 'kind': kind, 'licenses': ['Apache-2.0']}
        for source in inputs:
            record['sources'].setdefault(source, {'sha256': sha((ROOT / source).read_bytes())})

    for name, item in compiled['outputs'].items():
        add(name, item['data'].encode(), item['inputs'])
    template = 'packages/player-core/package.json'
    metadata = json.loads((ROOT / template).read_bytes())
    metadata.pop('private')
    metadata.pop('scripts')
    add('package.json', encoded(metadata), [template], 'metadata')
    add('LICENSE', (ROOT / 'LICENSES/Apache-2.0.txt').read_bytes(), ['LICENSES/Apache-2.0.txt'], 'notice')
    add('license-map.json', encoded({name: ['Apache-2.0'] for name in [*files, 'license-map.json']}),
        ['licensing/provider-packages.json'], 'metadata')
    auditor.audit('core', files, record)
    return files, record, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'build/media-components/player-core')
    args = parser.parse_args()
    files, record, metadata = assemble()
    args.output.mkdir(parents=True, exist_ok=True)
    archive_path = args.output / f"demuxe-{metadata['version']}.tgz"
    with archive_path.open('wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as gz:
        with tarfile.open(fileobj=gz, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name, data in sorted(files.items()):
                entry = tarfile.TarInfo('package/' + name)
                entry.size, entry.mode, entry.mtime = len(data), 0o644, 0
                archive.addfile(entry, io.BytesIO(data))
    # Audit the bytes that consumers actually receive, not just staging inputs.
    auditor.audit('core', auditor.archive_files(archive_path), record)
    record_path = args.output / 'build-inventory.json'
    record_path.write_bytes(encoded(record))
    result = {'archive': str(archive_path), 'archiveSHA256': sha(archive_path.read_bytes()),
              'record': str(record_path), 'recordSHA256': sha(record_path.read_bytes()), 'files': len(files),
              'qualification': 'local-core-package-only; optional providers and release remain separate'}
    (args.output / 'assembly.json').write_bytes(encoded(result))
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
