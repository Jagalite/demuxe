#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Rebuild the qualified core solely from the extracted application source."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--archive', type=Path, required=True)
parser.add_argument('--core-sha256', required=True)
parser.add_argument('--dependencies', type=Path, default=ROOT,
                    help='Checkout with dependencies installed from the matching package-lock.json')
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
args.output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='source-rebuild-', dir=args.output.parent) as temporary:
    work = Path(temporary)
    with tarfile.open(args.archive) as archive:
        archive.extractall(work, filter='data')
    source = work / 'demuxe'
    if (source / 'package-lock.json').read_bytes() != (args.dependencies / 'package-lock.json').read_bytes():
        raise ValueError('Dependency lock differs from source archive')
    (source / 'node_modules').symlink_to(args.dependencies.resolve() / 'node_modules', target_is_directory=True)
    subprocess.run(['python3', 'scripts/package-player-core.py', '--output', str((work / 'core').resolve())],
                   cwd=source, check=True)
    assembled = json.loads((work / 'core/assembly.json').read_text())
    if assembled['archiveSHA256'] != args.core_sha256:
        raise ValueError('Extracted-source core differs from the qualified archive')
    with args.archive.open('rb') as stream:
        source_sha = hashlib.file_digest(stream, 'sha256').hexdigest()
    report = {'passed': True, 'sourceSHA256': source_sha,
              'coreArchiveSHA256': assembled['archiveSHA256'],
              'scope': 'Ordinary core rebuilt from extracted source and locked installed dependencies; exact archive bytes match'}
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
