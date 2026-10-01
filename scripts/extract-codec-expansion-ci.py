#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Extract the inventory/blob format without tar traversal or link permissions."""
import re
import gzip
import sys
import tarfile
from pathlib import Path


MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024
MAX_TAR_OVERHEAD_BYTES = 25000 * 4096


def preflight(archive):
    """Inspect bounded raw headers before tarfile allocates extension metadata."""
    total, payload, headers, files = 0, 0, 0, 0
    with gzip.open(archive, 'rb') as stream:
        def read(count):
            nonlocal total
            data = stream.read(count)
            total += len(data)
            if total > MAX_TOTAL_BYTES + MAX_TAR_OVERHEAD_BYTES:
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
            if headers > 50000:
                raise ValueError('Raw header budget')
            size = tarfile.nti(header[124:136])
            metadata = header[156:157] in (b'x', b'g', b'L', b'K')
            if not metadata and header[156:157] not in (b'0', b'\0'):
                raise ValueError('Unsupported raw tar entry type')
            if size < 0 or size > (65536 if metadata else 256 * 1024 * 1024):
                raise ValueError('Metadata budget' if metadata else 'Raw entry budget')
            if not metadata:
                files += 1
                payload += size
                if files > 25000:
                    raise ValueError('Input entry budget exceeded')
                if payload > MAX_TOTAL_BYTES:
                    raise ValueError('Input byte budget exceeded')
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
        entries = source.getmembers()
        if len(entries) > 25000:
            raise ValueError('Input entry budget exceeded')
        names = set()
        total = 0
        for entry in entries:
            if not entry.isreg() or not re.fullmatch(r'(codec-expansion-ci-inventory\.json|blobs/[a-f0-9]{64})', entry.name):
                raise ValueError('Only canonical regular inventory/blob files allowed: ' + entry.name)
            if entry.name in names or entry.size < 0 or entry.size > 256 * 1024 * 1024:
                raise ValueError('Duplicate or oversized input')
            names.add(entry.name)
            total += entry.size
            if total > MAX_TOTAL_BYTES:
                raise ValueError('Input byte budget exceeded')
        if 'codec-expansion-ci-inventory.json' not in names:
            raise ValueError('Missing inventory')
        destination.mkdir(parents=True)
        for entry in entries:
            target = destination / entry.name
            target.parent.mkdir(parents=True, exist_ok=True)
            with source.extractfile(entry) as stream, target.open('xb') as output:
                remaining = entry.size
                while remaining:
                    block = stream.read(min(remaining, 1024 * 1024))
                    if not block:
                        raise ValueError('Truncated input')
                    output.write(block)
                    remaining -= len(block)


if __name__ == '__main__':
    extract(*sys.argv[1:])
