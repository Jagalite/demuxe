#!/usr/bin/env python3
import pathlib,os,subprocess,tarfile,json,hashlib,time
r=pathlib.Path.cwd();base=r/'build/microcodec';archive=base/'flac-1.4.3.tar.xz';assert hashlib.sha256(archive.read_bytes()).hexdigest()=='6c58e69cd22348f441b861092b825e591d0b822e106de6eb0ee4d05d27205b70';source=base/'flac-1.4.3';out=base/'libflac-Oz';out.mkdir(exist_ok=True)
if not source.exists():
 with tarfile.open(archive) as t:t.extractall(base,filter='data')
sdk=(r/'build/emsdk-4.0.14').resolve();env={**os.environ,'EM_CONFIG':str(base/'emscripten.config'),'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH']}
commands=[['emcmake','cmake','-S',str(source),'-B',str(out/'obj'),'-DCMAKE_BUILD_TYPE=Release','-DCMAKE_C_FLAGS=-Oz -flto -msimd128','-DBUILD_SHARED_LIBS=OFF','-DBUILD_CXXLIBS=OFF','-DBUILD_PROGRAMS=OFF','-DBUILD_EXAMPLES=OFF','-DBUILD_TESTING=OFF','-DWITH_OGG=OFF','-DINSTALL_MANPAGES=OFF'],['cmake','--build',str(out/'obj'),'-j4']]
exports=['enc_header','enc_header_size','enc_create','enc_input','enc_encode','enc_data','enc_size','enc_destroy','malloc','free']
commands.append(['emcc','-Oz','-flto','-msimd128','-I'+str(source/'include'),str(r/'experiments/microcodec/libflac.c'),str(out/'obj/src/libFLAC/libFLAC.a'),'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=web,worker,node','-sINITIAL_MEMORY=2097152','-sSTACK_SIZE=262144','-sALLOW_MEMORY_GROWTH=1','-sFILESYSTEM=0','-sMALLOC=emmalloc','-sSUPPORT_LONGJMP=0','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+x for x in exports]),'-sEXPORTED_RUNTIME_METHODS=["HEAPU8","HEAP32"]','-o',str(out/'module.mjs')])
t=time.monotonic()
with (out/'build.log').open('w') as log:
 for cmd in commands:subprocess.run(cmd,env=env,stdout=log,stderr=subprocess.STDOUT,check=True)
(out/'provenance.json').write_text(json.dumps({'url':'https://downloads.xiph.org/releases/flac/flac-1.4.3.tar.xz','sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'commands':commands,'seconds':time.monotonic()-t},indent=2))
