# SPDX-License-Identifier: MIT
"""Identity of the dependency files read by the final service compilation."""
import hashlib,json,pathlib
LINK_ROOTS=('sources/mpv','objects/mpv','prefix/include','prefix/lib/pkgconfig')
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def link_inputs(root):
    result={}
    for name in LINK_ROOTS:
        folder=root/name
        if not folder.is_dir():raise ValueError('Missing link input directory: '+name)
        for p in sorted(folder.rglob('*')):
            if p.is_file():result[str(p.relative_to(root))]=digest(p)
    return result
def verify_dependencies(root,sdk):
    record=json.loads((root/'build-result.json').read_text())
    if record.get('status')!='built_dependencies_only':raise ValueError('Successful private dependencies required')
    wanted=record.get('linkInputSHA256')
    if not wanted:raise ValueError('Legacy dependency build lacks link-input provenance; rebuild required')
    if link_inputs(root)!=wanted:raise ValueError('Dependency source/header/configuration drift')
    archives=record.get('archives',{})
    if not archives or {str(p.relative_to(root)):digest(p) for p in (root/'prefix/lib').glob('*.a')}!=archives:
        raise ValueError('Dependency archive drift')
    for key,rel in [('clangSHA256','upstream/bin/clang'),('wasmOptSHA256','upstream/bin/wasm-opt'),('emccSHA256','upstream/emscripten/emcc.py')]:
        if digest(sdk/rel)!=record['toolchain'].get(key):raise ValueError('Dependency SDK mismatch: '+key)
    for name,wanted in record['inputSHA256'].items():
        if digest(root/name)!=wanted:raise ValueError('Dependency original input drift: '+name)
    return record
