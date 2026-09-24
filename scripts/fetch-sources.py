#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Fetch only locked upstream archives, verifying their SHA-256 before extraction."""
import hashlib
import json
import os
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
for item in json.loads((ROOT / 'sources.lock.json').read_text())['sources']:
    archive = ROOT / 'build' / 'downloads' / (item['name'] + '.tar.gz')
    archive.parent.mkdir(parents=True, exist_ok=True)
    previous = hashlib.sha256(archive.read_bytes()).hexdigest() if archive.exists() else None
    refreshed = previous != item['sha256']
    if refreshed:
        with tempfile.NamedTemporaryFile(prefix=item['name'] + '-', suffix='.tar.gz', dir=archive.parent, delete=False) as temp:
            incoming = pathlib.Path(temp.name)
        try:
            subprocess.run(['curl', '-fL', '--retry', '3', item['url'], '-o', str(incoming)], check=True)
            if hashlib.sha256(incoming.read_bytes()).hexdigest() != item['sha256']:
                raise SystemExit(f"Hash mismatch: {item['name']}")
            os.replace(incoming, archive)
        finally:
            incoming.unlink(missing_ok=True)
    digest = item['sha256']
    target = ROOT / 'build' / 'sources' / item['name']
    marker = target / '.demuxe-source-lock.json'
    recorded = json.loads(marker.read_text()).get('sha256') if marker.exists() else None
    # Unmarked legacy trees have no reliable identity. Re-extract them once so
    # an interrupted archive update cannot pair a new lock with old code.
    needs_extract = not target.is_dir() or recorded != digest
    if needs_extract:
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='source-next-', dir=target.parent) as temp:
            stage = pathlib.Path(temp) / item['name']
            stage.mkdir()
            # Only SHA-256 verified archives listed in our source lock reach tar.
            subprocess.run(['tar', '-xf', str(archive), '--strip-components=1', '-C', str(stage)], check=True)
            marker_data = {'sha256': digest, 'revision': item['revision']}
            (stage / '.demuxe-source-lock.json').write_text(json.dumps(marker_data, sort_keys=True) + '\n')
            if target.exists() or target.is_symlink():
                backups = ROOT / 'build' / 'source-backups'
                backups.mkdir(exist_ok=True)
                stem = f"{item['name']}-{(recorded or previous or 'unmarked')[:12]}"
                backup = backups / stem
                index = 1
                while backup.exists() or backup.is_symlink():
                    backup = backups / f'{stem}-{index}'
                    index += 1
                target.rename(backup)
            stage.rename(target)
    print(item['name'], digest)
