#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Extract only canonical pinned inventory/blob entries, never links or paths."""
import re
import gzip
import sys
import tarfile
from pathlib import Path


def preflight(archive):
    """Bound raw headers before tarfile can allocate PAX/GNU metadata."""
    total, headers = 0, 0
    limit = 136 * 1024 * 1024  # 128 MiB files plus bounded header/padding space
    with gzip.open(archive, 'rb') as stream:
        def read(count):
            nonlocal total
            data = stream.read(count)
            total += len(data)
            if total > limit:
                raise ValueError('Expanded tar budget')
            return data

        while True:
            header = read(512)
            if not header or len(header) != 512:
                raise ValueError('Missing or truncated tar terminator')
            if not any(header):
                while True:
                    trailing = read(1024 * 1024)
                    if not trailing:
                        return
                    if any(trailing):
                        raise ValueError('Nonzero bytes after tar terminator')
            headers += 1
            if headers > 4002:
                raise ValueError('Raw header budget')
            size = tarfile.nti(header[124:136])
            metadata = header[156:157] in (b'x', b'g', b'L', b'K')
            if not metadata and header[156:157] not in (b'0', b'\0'):
                raise ValueError('Unsupported raw tar entry type')
            if size < 0 or size > (65536 if metadata else 32 * 1024 * 1024):
                raise ValueError('Metadata budget' if metadata else 'Raw entry budget')
            remaining = ((size + 511) // 512) * 512
            while remaining:
                count = min(remaining, 1024 * 1024)
                if len(read(count)) != count:
                    raise ValueError('Truncated raw tar payload')
                remaining -= count


def extract(archive, destination):
    destination = Path(destination)
    if destination.exists():
        raise ValueError('Use a fresh input directory')
    preflight(archive)
    with tarfile.open(archive, 'r:gz') as source:
        entries, names, total = [], set(), 0
        # Validate each header before advancing across its payload. A gzip bomb
        # cannot force unbounded traversal before the file/total budgets apply.
        for entry in source:
            if len(entries) >= 2001:
                raise ValueError('Entry budget')
            if not entry.isreg() or not re.fullmatch(r'(webm-installed-input-inventory\.json|blobs/[a-f0-9]{64})', entry.name):
                raise ValueError('Only canonical regular inventory/blob files allowed')
            if entry.name in names or entry.size < 0 or entry.size > 32 * 1024 * 1024:
                raise ValueError('Duplicate or oversized input')
            names.add(entry.name)
            entries.append(entry)
            total += entry.size
            if total > 128 * 1024 * 1024:
                raise ValueError('Byte budget')
        if 'webm-installed-input-inventory.json' not in names:
            raise ValueError('Missing inventory')
        destination.mkdir(parents=True)
        for entry in entries:
            target = destination / entry.name
            target.parent.mkdir(parents=True, exist_ok=True)
            with source.extractfile(entry) as stream, target.open('xb') as out:
                remaining = entry.size
                while remaining:
                    block = stream.read(min(remaining, 1024 * 1024))
                    if not block:
                        raise ValueError('Truncated input')
                    out.write(block)
                    remaining -= len(block)


if __name__ == '__main__':
    extract(*sys.argv[1:])
