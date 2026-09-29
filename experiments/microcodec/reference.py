#!/usr/bin/env python3
# Link identical packet ABI against the installed adaptation build's libraries.
import pathlib,json,subprocess,os
r=pathlib.Path.cwd();out=r/'build/microcodec/reference-O2';out.mkdir(exist_ok=True)
m=json.loads((r/'web/engine-adaptation/manifest.json').read_text());cmd=m['linkCommand'];includes=[s for s in cmd if s.startswith('-I')];libs=[s for s in cmd if s.endswith(('libavcodec.a','libswresample.a','libavutil.a'))]
for f in libs:
 import hashlib
 assert hashlib.sha256(pathlib.Path(f).read_bytes()).hexdigest()==m['files'][f]['sha256']
sdk=(r/'build/emsdk-4.0.14').resolve();env={**os.environ,'EM_CONFIG':str(r/'build/microcodec/emscripten.config'),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH']}
exports=['mc_create','mc_configure','mc_decode','mc_frame','mc_flush','mc_reset','mc_destroy','mc_info','mc_plane','malloc','free']
args=['emcc','-O2','-pthread','-msimd128',*includes,str(r/'experiments/microcodec/codec.c'),*libs,'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=node,worker','-sINITIAL_MEMORY=67108864','-sALLOW_MEMORY_GROWTH=1','-sFILESYSTEM=0','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+x for x in exports]),'-sEXPORTED_RUNTIME_METHODS=["HEAPU8","HEAPF32"]','-o',str(out/'module.mjs')]
subprocess.run(args,env=env,check=True);(out/'provenance.json').write_text(json.dumps({'link':args,'referenceManifest':m},indent=2))
