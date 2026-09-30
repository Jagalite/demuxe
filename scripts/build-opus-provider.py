#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build the pinned libopus mono/stereo packet encoder. Qualification is separate."""
import argparse,hashlib,json,os,pathlib,shutil,subprocess,tarfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--sdk',type=pathlib.Path,required=True);p.add_argument('--archive',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,default=ROOT/'build/opus-provider');a=p.parse_args()
sdk=a.sdk.resolve();archive=a.archive.resolve();out=a.out.resolve()
lock=next(s for s in json.loads((ROOT/'sources.lock.json').read_text())['sources'] if s['name']=='opus-audio')
if digest(archive)!=lock['sha256']:raise ValueError('Pinned Opus archive mismatch')
if json.loads((sdk/'upstream/emscripten/emscripten-version.txt').read_text())!='4.0.14':raise ValueError('SDK version mismatch')
inputs={str(f.relative_to(ROOT)):digest(f) for f in [ROOT/'native/audio-codecs/opus-encoder.c',ROOT/'scripts/build-opus-provider.py']}
key=hashlib.sha256(json.dumps([lock,inputs],sort_keys=True).encode()).hexdigest();work=out/key;work.mkdir(parents=True,exist_ok=True)
source=out/'sources'/lock['sha256']
if not source.exists():
 stage=source.with_name(source.name+'-partial');stage.mkdir(parents=True,exist_ok=True)
 with tarfile.open(archive) as t:t.extractall(stage,filter='data')
 stage.rename(source)
source=next(source.iterdir());obj=work/'opus-encoder';obj.mkdir(exist_ok=True)
config=work/'emscripten.config';config.write_text(f'LLVM_ROOT = {str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT = {str(sdk/"upstream")!r}\nNODE_JS = {shutil.which("node")!r}\nCACHE = {str(work/"cache")!r}\n')
flags=['-Oz','-flto','-msimd128'];env={**os.environ,'EM_CONFIG':str(config),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH'],'SOURCE_DATE_EPOCH':'1740000000','CFLAGS':' '.join(flags),'EMCC_CORES':'2'}
configure=['emconfigure',str(source/'configure'),'--host=wasm32-unknown-emscripten','--disable-shared','--enable-static','--disable-extra-programs','--disable-doc','--disable-intrinsics','--disable-rtcd','--disable-stack-protector']
def run(cmd):
 with (obj/'build.log').open('a') as log:subprocess.run(cmd,cwd=obj,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
if not (obj/'Makefile').exists():run(configure)
run(['make','-j2'])
exports=['malloc','free','ae_create','ae_destroy','ae_size','ae_input','ae_send','ae_receive','ae_data','ae_bytes','ae_pts','ae_duration','ae_header','ae_header_size','ae_preskip']
link=['emcc',*flags,'-I'+str(source/'include'),str(ROOT/'native/audio-codecs/opus-encoder.c'),str(obj/'.libs/libopus.a'),'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=web,worker,node','-sINITIAL_MEMORY=2097152','-sSTACK_SIZE=262144','-sALLOW_MEMORY_GROWTH=1','-sMAXIMUM_MEMORY=134217728','-sFILESYSTEM=0','-sMALLOC=emmalloc','-sSUPPORT_LONGJMP=0','-sWASM_BIGINT=1','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+s for s in exports]),'-sEXPORTED_RUNTIME_METHODS='+json.dumps(['HEAPU8','HEAP32']),'-o',str(obj/'module.mjs')]
run(link)
module=obj/'module.mjs';module.write_text('// SPDX-License-Identifier: BSD-3-Clause\n'+module.read_text())
record={'schema':1,'source':lock,'sourceKey':key,'sdk':'4.0.14','inputs':inputs,'configure':configure,'link':link,'profile':'opus-encoder','capabilities':['audio.encode.opus'],'qualification':'build-only','artifacts':{s:{'sha256':digest(obj/s),'bytes':(obj/s).stat().st_size} for s in ['module.mjs','module.wasm']},'effectiveConfig':{'config.h':digest(obj/'config.h')}}
(obj/'build-record.json').write_text(json.dumps(record,indent=2)+'\n');(out/'opus-encoder.json').write_text(json.dumps({'directory':str(obj),'recordSHA256':digest(obj/'build-record.json')},indent=2)+'\n');print(obj)
