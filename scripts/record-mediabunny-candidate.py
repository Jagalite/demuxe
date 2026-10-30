#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Record exact private MediaBunny candidate bytes; this does not grant review."""
import argparse
import json
from pathlib import Path

from license_policy import encoded, sha
from mediabunny_package_audit import audit, record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--payload', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    root = args.payload.absolute()
    if not root.is_dir() or any(path.is_symlink() for path in (root, *root.parents)):
        raise ValueError('Invalid or symlinked payload root')
    files = {}; total = 0
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            raise ValueError('Symlink in candidate payload')
        if path.is_dir():
            continue
        if not path.is_file() or path.stat().st_size > 128 * 1024 * 1024:
            raise ValueError('Nonregular or excessive candidate file')
        name = path.relative_to(root).as_posix()
        total += path.stat().st_size
        if total > 512 * 1024 * 1024 or len(files) >= 20000:
            raise ValueError('Candidate payload budget exceeded')
        files[name] = path.read_bytes()
    inventory = record(files)
    result = audit(files, inventory)
    raw = encoded(inventory)
    with args.output.open('xb') as output:
        output.write(raw)
    print(json.dumps({'status': result['status'], 'record': str(args.output),
                      'sha256': sha(raw), 'files': result['files'], 'sources': result['sources']}))


if __name__ == '__main__':
    main()
