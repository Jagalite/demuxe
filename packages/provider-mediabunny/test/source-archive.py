#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Validate source archive members before optionally extracting to a new directory.

This checks archive structure and budgets; it does not establish provenance or
qualify the contents. Callers separately verify the source manifest and hashes.
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import tarfile

MAX_COMPRESSED_BYTES = 128 * 1024 * 1024
MAX_ENTRIES = 20000
MAX_FILE_BYTES = 128 * 1024 * 1024
MAX_TOTAL_BYTES = 512 * 1024 * 1024


def validate(archive):
    entries = {}
    total = 0
    for member in archive:
        if len(entries) >= MAX_ENTRIES:
            raise ValueError('Source archive entry budget exceeded')
        if not (member.isfile() or member.isdir()):
            raise ValueError('Source archive contains links or special files')
        name = member.name
        if member.isdir() and name.endswith('/'):
            name = name[:-1]
        parts = name.split('/')
        if (not name or name.startswith('/') or '\\' in name or
                any(ord(char) < 32 or ord(char) == 127 for char in name) or
                any(part in ('', '.', '..') for part in parts)):
            raise ValueError('Non-canonical source archive member: ' + repr(member.name))
        if any(part.startswith('._') or part in ('__MACOSX', '__pycache__', 'node_modules') for part in parts) or name.endswith('.pyc'):
            raise ValueError('Excluded source archive member: ' + name)
        if name in entries:
            raise ValueError('Duplicate source archive member: ' + name)
        if member.size < 0 or member.size > MAX_FILE_BYTES or (member.isdir() and member.size):
            raise ValueError('Source archive member exceeds byte budget: ' + name)
        total += member.size
        if total > MAX_TOTAL_BYTES:
            raise ValueError('Source archive total byte budget exceeded')
        # Read every payload during validation so truncated member data is
        # detected before any earlier member is written.
        if member.isfile():
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError('Unreadable source archive member: ' + name)
            remaining = member.size
            while remaining:
                chunk = stream.read(min(65536, remaining))
                if not chunk:
                    raise ValueError('Truncated source archive member: ' + name)
                remaining -= len(chunk)
        entries[name] = member
    for name in entries:
        parts = name.split('/')
        for count in range(1, len(parts)):
            ancestor = entries.get('/'.join(parts[:count]))
            if ancestor is not None and not ancestor.isdir():
                raise ValueError('Source archive file/directory collision: ' + name)
    if not entries:
        raise ValueError('Empty source archive')
    return entries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--extract', type=Path)
    parser.add_argument('--sha256', help='Require the recorded compressed archive digest')
    parser.add_argument('--bytes', type=int, help='Require the recorded compressed archive size')
    args = parser.parse_args()
    with args.archive.open('rb') as source:
        compressed = source.read(MAX_COMPRESSED_BYTES + 1)
    if len(compressed) > MAX_COMPRESSED_BYTES:
        raise ValueError('Compressed source archive exceeds byte budget')
    if args.bytes is not None and len(compressed) != args.bytes:
        raise ValueError('Source archive size mismatch')
    if args.sha256 is not None and hashlib.sha256(compressed).hexdigest() != args.sha256:
        raise ValueError('Source archive digest mismatch')
    # Validate and extract the same immutable bytes even if the input path changes.
    with tarfile.open(fileobj=io.BytesIO(compressed), mode='r:gz') as archive:
        entries = validate(archive)
        if args.extract is not None:
            # The destination must be caller-owned and empty; do not merge into
            # an existing source tree or let a stale symlink redirect writes.
            if args.extract.is_symlink() or not args.extract.is_dir() or any(args.extract.iterdir()):
                raise ValueError('Extraction destination must be an empty directory')
            archive.extractall(args.extract, members=entries.values(), filter='data')
        print(json.dumps({'files': len(entries), 'bytes': sum(m.size for m in entries.values())}))


if __name__ == '__main__':
    main()
