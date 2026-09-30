#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Assemble an optional provider from a pinned, reviewed build inventory.

No globbing of the checkout, implicit native builds or downloads. The producing
build supplies its exact payload, complete provenance and matching source/relink
material; audit-provider-package.py verifies it before and after tar creation.
"""
import argparse
import gzip
import importlib.util
import io
import json
from pathlib import Path
import tarfile

from license_policy import ROOT, sha

spec = importlib.util.spec_from_file_location('provider_audit', ROOT / 'scripts/audit-provider-package.py')
auditor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auditor)


def assemble(target, payload, record, output):
    payload = Path(payload).absolute()
    # Reject every symlink component, including the supplied staging root.
    for parent in [payload, *payload.parents]:
        if parent.is_symlink():
            raise ValueError('Symlinked provider payload root')
    if not payload.is_dir():
        raise ValueError('Provider payload directory does not exist')
    files = {}
    total = 0
    for name in record['files']:
        auditor.safe_path(name)
        candidate = payload
        for part in Path(name).parts:
            candidate = candidate / part
            if candidate.is_symlink():
                raise ValueError('Symlinked provider payload input: ' + name)
        if not candidate.is_file() or candidate.stat().st_size > 256 * 1024 * 1024:
            raise ValueError('Missing or excessive provider payload input: ' + name)
        files[name] = candidate.read_bytes()
        total += len(files[name])
        if total > 512 * 1024 * 1024 or len(files) > 20000:
            raise ValueError('Provider payload budget exceeded')
    auditor.audit(target, files, record)
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation protects an existing reviewed archive.
    with output.open('xb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0) as gz:
        with tarfile.open(fileobj=gz, mode='w', format=tarfile.PAX_FORMAT) as archive:
            for name, data in sorted(files.items()):
                entry = tarfile.TarInfo('package/' + name)
                entry.size, entry.mode, entry.mtime = len(data), 0o644, 0
                archive.addfile(entry, io.BytesIO(data))
    auditor.audit(target, auditor.archive_files(output), record)
    return {'archive': str(output), 'sha256': sha(output.read_bytes()), 'files': len(files)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', choices=[name for name in json.loads((ROOT/'licensing/provider-packages.json').read_text())['targets'] if name!='core'], required=True)
    parser.add_argument('--payload', type=Path, required=True)
    parser.add_argument('--record', type=Path, required=True)
    parser.add_argument('--record-sha256', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    raw = args.record.read_bytes()
    if sha(raw) != args.record_sha256:
        raise SystemExit('Reviewed provider build inventory hash mismatch')
    try:
        print(json.dumps(assemble(args.target, args.payload, json.loads(raw), args.output), indent=2))
    except (ValueError, KeyError, TypeError, OSError, tarfile.TarError) as error:
        raise SystemExit(str(error)) from error


if __name__ == '__main__':
    main()
