#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Link the optional external subtitle worker from the pinned root libass build.
Build libraries with scripts/build.sh first. No runtime installation or release.
"""
import argparse,pathlib,subprocess,os,json,hashlib,time,shutil
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--sdk',type=pathlib.Path,required=True);p.add_argument('--cache',type=pathlib.Path);p.add_argument('--library-root',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args()
sdk=a.sdk.resolve();libroot=a.library_root.resolve();out=a.output.resolve()
assert not out.exists(),'Use a fresh output';out.mkdir(parents=True)
lock=json.loads((root/'sources.lock.json').read_text());other=json.loads((libroot/'sources.lock.json').read_text())
names={'libass','freetype','fribidi','harfbuzz'}
inputs=[s for s in lock['sources'] if s['name'] in names]
assert inputs==[s for s in other['sources'] if s['name'] in names],'Library source locks mismatch'
assert json.loads((sdk/'upstream/emscripten/emscripten-version.txt').read_text())=='4.0.14'
prefix=libroot/'build/prefix';archives=[prefix/'lib'/('lib'+n+'.a') for n in ['ass','freetype','fribidi','harfbuzz']]
config=out/'emscripten.config';config.write_text(f"LLVM_ROOT = {str(sdk/'upstream/bin')!r}\nBINARYEN_ROOT = {str(sdk/'upstream')!r}\nNODE_JS = {shutil.which('node')!r}\nCACHE = {str(a.cache.resolve() if a.cache else out/'cache')!r}\n")
env={**os.environ,'EM_CONFIG':str(config),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH'],'SOURCE_DATE_EPOCH':'1740000000'}
cmd=['emcc','-O2','-pthread','-msimd128','-ffile-prefix-map='+str(root)+'=/demuxe','-I'+str(prefix/'include'),str(root/'native/subtitles/ass.c'),'-Wl,--start-group',*[str(x) for x in archives],'-Wl,--end-group','-lstdc++','-sMODULARIZE=1','-sEXPORT_ES6=1','-sEXPORT_NAME=createSubtitles','-sENVIRONMENT=worker','-sINITIAL_MEMORY=33554432','-sMAXIMUM_MEMORY=134217728','-sALLOW_MEMORY_GROWTH=1','-sSTACK_SIZE=2097152','-sFILESYSTEM=0','-sEXPORTED_FUNCTIONS=["_subtitle_api_version","_subtitle_init","_subtitle_font","_subtitle_load","_subtitle_render","_subtitle_close","_malloc","_free"]','-sEXPORTED_RUNTIME_METHODS=["HEAPU8","ccall"]','-o',str(out/'subtitles.mjs')]
subprocess.run(cmd,env=env,check=True)
files=[*archives,root/'native/subtitles/ass.c',root/'scripts/link-native-ass.py',out/'subtitles.mjs',out/'subtitles.wasm']
(out/'manifest.json').write_text(json.dumps({'apiVersion':2,'sources':inputs,'sdk':'4.0.14','scope':'Local optional libass link; library hashes recorded; release source correspondence still required','files':{str(f):{'sha256':hashlib.sha256(f.read_bytes()).hexdigest(),'bytes':f.stat().st_size} for f in files}},indent=2)+'\n')
for f in [root/'native/subtitles/ass.c',root/'scripts/link-native-ass.py']:
 target=out/'sources'/f.relative_to(root);target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,target)
