#!/usr/bin/env python3
"""Normalize embedded configuration strings before compilation, never archive bytes.

Compiler -ffile-prefix-map covers __FILE__; generated configuration literals need
the same stable virtual root. Keep build-system paths and full evidence untouched.
"""
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent.parent
for name in sys.argv[1:]:
    header = (root / name).resolve()
    if not header.is_relative_to(root / 'build') or header.suffix != '.h':
        raise SystemExit('Expected a generated build header: ' + name)
    content = header.read_bytes()
    normalized = content.replace(str(root).encode() + b'/', b'/deplexr/')
    if normalized != content:
        header.write_bytes(normalized)
        print('Normalized embedded build paths: ' + name)
