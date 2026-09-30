#!/usr/bin/env python3
# One-time correction for pilot builds configured before --optflags was explicit.
# Does not touch FFmpeg sources. Retains original configuration evidence.
import pathlib,re,subprocess,os,json,time
r=pathlib.Path.cwd();base=r/'build/microcodec';sdk=(r/'build/emsdk-4.0.14').resolve();env={**os.environ,'EM_CONFIG':str(base/'emscripten.config'),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH']}
for profile in ['ac3','remux','adaptation','flac']:
 obj=base/(profile+'-Oz')
 while not (obj/'provenance.json').exists():time.sleep(2)
 f=obj/'ffbuild/config.mak';s=f.read_text()
 if ' -O3 ' not in s:continue
 (obj/'pilot-config.mak').write_text(s);f.write_text(s.replace(' -O3 ',' -Oz '))
 subprocess.run(['make','clean'],cwd=obj,env=env,stdout=subprocess.DEVNULL,check=True)
 subprocess.run(['python3',str(r/'experiments/microcodec/build.py'),'--profile',profile],check=True)
 manifest=json.loads((obj/'provenance.json').read_text());manifest['pilotCorrection']='Initial configure omitted --optflags. All objects cleaned and rebuilt after replacing -O3 with -Oz in config.mak; pilot-config.mak retained.';(obj/'provenance.json').write_text(json.dumps(manifest,indent=2))
