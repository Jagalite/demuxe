#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build optional libass from verified archives in a fresh, isolated directory.

This records source correspondence; it does not grant release admission.
"""
import argparse
import hashlib
import json
import os
import pathlib
import platform
import shutil
import subprocess

root = pathlib.Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--sdk', type=pathlib.Path, required=True)
p.add_argument('--archives', type=pathlib.Path, required=True)
p.add_argument('--output', type=pathlib.Path, required=True)
p.add_argument('--meson', default='meson')
p.add_argument('--jobs', type=int, default=4)
a = p.parse_args()
out, sdk = a.output.resolve(), a.sdk.resolve()
if out.exists():
    raise SystemExit('Use a fresh output directory')
if a.jobs < 1:
    raise SystemExit('jobs must be positive')
if json.loads((sdk/'upstream/emscripten/emscripten-version.txt').read_text()) != '4.0.14':
    raise SystemExit('Expected Emscripten 4.0.14')
meson = shutil.which(a.meson)
if not meson:
    raise SystemExit('Meson is required')
names = ['freetype', 'fribidi', 'harfbuzz', 'libass']
locked = {s['name']: s for s in json.loads((root/'sources.lock.json').read_text())['sources']}
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
for name in names:
    if digest(a.archives/(name+'.tar.gz')) != locked[name]['sha256']:
        raise SystemExit('Source archive hash mismatch: '+name)
out.mkdir(parents=True)
library = out/'library'
prefix = library/'build/prefix'
prefix.mkdir(parents=True)
for name in ['sources.lock.json', 'toolchain.lock.json', 'scripts/build-native-ass.py',
             'scripts/link-native-ass.py', 'scripts/build.sh', 'scripts/fetch-sources.py',
             'scripts/apply-patches.py']:
    dest = library/name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root/name, dest)
config = out/'emscripten.config'
config.write_text(f"LLVM_ROOT = {str(sdk/'upstream/bin')!r}\nBINARYEN_ROOT = {str(sdk/'upstream')!r}\nNODE_JS = {shutil.which('node')!r}\nCACHE = {str(out/'cache')!r}\n")
env = {**os.environ, 'EM_CONFIG': str(config), 'EM_CACHE': str(out/'cache'),
       'PATH': str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH'],
       'SOURCE_DATE_EPOCH': '1740000000', 'PKG_CONFIG_LIBDIR': str(prefix/'lib/pkgconfig'),
       'PKG_CONFIG_PATH': str(prefix/'lib/pkgconfig'), 'EM_PKG_CONFIG_PATH': str(prefix/'lib/pkgconfig')}
flags = ['-O2', '-pthread', '-msimd128', '-ffile-prefix-map='+str(out)+'=/demuxe-ass']
env.update(CFLAGS=' '.join(flags), CXXFLAGS=' '.join(flags), LDFLAGS='-pthread')
commands = []
tool_paths = [pathlib.Path(meson), sdk/'upstream/bin/clang', sdk/'upstream/bin/wasm-ld',
              sdk/'upstream/bin/wasm-opt', sdk/'upstream/emscripten/emcc.py']
tool_paths += [pathlib.Path(shutil.which(n)) for n in ['node','cmake','ninja','pkg-config']]
tool_hashes = {str(f):digest(f) for f in tool_paths}
def run(cmd):
    cmd = [str(c) for c in cmd]
    commands.append(cmd)
    (out/'commands.json').write_text(json.dumps(commands, indent=2)+'\n')
    subprocess.run(cmd, env=env, check=True)
for name in names:
    source = library/'build/sources'/name
    source.mkdir(parents=True)
    run(['tar', '-xf', a.archives/(name+'.tar.gz'), '--strip-components=1', '-C', source])
cross = out/'cross.ini'
cross.write_text('[binaries]\n'+''.join(f'{k} = {shutil.which(v, path=env["PATH"])!r}\n' for k,v in
    [('c','emcc'),('cpp','em++'),('ar','emar'),('strip','emstrip'),('pkg-config','pkg-config')])+
    "[host_machine]\nsystem = 'emscripten'\ncpu_family = 'wasm32'\ncpu = 'wasm32'\nendian = 'little'\n"
    "[properties]\nneeds_exe_wrapper = true\n[built-in options]\n"+
    f'c_args = {flags!r}\ncpp_args = {flags!r}\nc_link_args = [\'-pthread\']\ncpp_link_args = [\'-pthread\']\n')
run(['emcmake','cmake','-S',library/'build/sources/freetype','-B',out/'obj-freetype','-G','Ninja',
     '-DCMAKE_INSTALL_PREFIX='+str(prefix), '-DCMAKE_BUILD_TYPE=Release','-DBUILD_SHARED_LIBS=OFF',
     '-DFT_DISABLE_ZLIB=TRUE','-DFT_DISABLE_BZIP2=TRUE','-DFT_DISABLE_PNG=TRUE',
     '-DFT_DISABLE_HARFBUZZ=TRUE','-DFT_DISABLE_BROTLI=TRUE'])
run(['cmake','--build',out/'obj-freetype','-j',a.jobs])
run(['cmake','--install',out/'obj-freetype'])
for name, options in [('fribidi',['-Ddocs=false','-Dbin=false','-Dtests=false']),
                      ('harfbuzz',['-Dfreetype=enabled','-Dtests=disabled','-Dutilities=disabled']),
                      ('libass',['-Drequire-system-font-provider=false'])]:
    obj = out/('obj-'+name)
    run([meson,'setup',obj,library/'build/sources'/name,'--cross-file',cross,'--prefix',prefix,
         '--libdir','lib','--default-library','static','--buildtype','release','--wrap-mode','nofallback',
         '-Dauto_features=disabled',*options])
    run(['ninja','-C',obj,'-j',a.jobs])
    run([meson,'install','-C',obj])
run(['python3',root/'scripts/link-native-ass.py','--sdk',sdk,'--library-root',library,
     '--cache',out/'cache','--output',out/'runtime'])
record = {'schema':1, 'qualification':'clean isolated source build; release verifier still required',
          'host':platform.platform(), 'historicalLinuxToolchainLockAppliesToHost':False,
          'tools':tool_hashes,
          'archives':{name:locked[name] for name in names}, 'commands':commands,
          'files':{str(f.relative_to(library)):digest(f) for f in sorted(library.rglob('*')) if f.is_file()}}
if any(digest(pathlib.Path(f)) != h for f,h in tool_hashes.items()):
    raise SystemExit('Build tools changed while building')
(library/'source-build.json').write_text(json.dumps(record, indent=2)+'\n')
print('Built optional ASS runtime:',out/'runtime')
