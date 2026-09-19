#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Check a clean optional ASS build's sources and linked archive correspondence."""
import argparse
import hashlib
import json
import pathlib

def verify(runtime):
    runtime = runtime.resolve()
    manifest = json.loads((runtime/'manifest.json').read_text())
    library = pathlib.Path(next(k for k in manifest['files'] if k.endswith('/lib/libass.a'))).parents[3]
    record = json.loads((library/'source-build.json').read_text())
    if record['schema'] != 1 or manifest['apiVersion'] != 2:
        raise ValueError('Unsupported ASS build record or runtime interface')
    required = [runtime/'subtitles.mjs', runtime/'subtitles.wasm']
    required += [library/'build/prefix/lib'/('lib'+name+'.a') for name in ['ass','freetype','fribidi','harfbuzz']]
    if any(str(path) not in manifest['files'] for path in required):
        raise ValueError('Incomplete linked runtime/library inventory')
    for relative, digest in record['files'].items():
        path = (library/relative).resolve()
        if not path.is_relative_to(library.resolve()):
            raise ValueError('Source record escapes its library directory')
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError('Source build hash mismatch: '+relative)
    for filename, expected in manifest['files'].items():
        path = pathlib.Path(filename)
        if hashlib.sha256(path.read_bytes()).hexdigest() != expected['sha256']:
            raise ValueError('Linked input/output hash mismatch: '+filename)
        if path.suffix == '.a' and record['files'].get(str(path.relative_to(library))) != expected['sha256']:
            raise ValueError('Linked library is not from the recorded source build')
    if sorted(record['archives']) != ['freetype','fribidi','harfbuzz','libass']:
        raise ValueError('Incomplete library source inventory')
    if sorted(record['archives'].values(), key=lambda x:x['name']) != sorted(manifest['sources'], key=lambda x:x['name']):
        raise ValueError('Library source locks differ from runtime inputs')
    return {'verified':True, 'sourceFiles':len(record['files']),
            'runtimeFiles':len(manifest['files']), 'releaseQualified':False}

if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('runtime', type=pathlib.Path)
    print(json.dumps(verify(p.parse_args().runtime), indent=2))
