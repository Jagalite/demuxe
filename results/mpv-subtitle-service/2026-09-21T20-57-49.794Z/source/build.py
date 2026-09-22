# SPDX-License-Identifier: Apache-2.0
import os,json,shlex,subprocess,pathlib
repo=pathlib.Path(__file__).resolve().parents[2];base=pathlib.Path('/Volumes/seed2/Projects/webmpv');out=repo/'build/mpv-subtitle-service';out.mkdir(exist_ok=True)
env=os.environ.copy();env['EM_CONFIG']=str(base/'build/gap.emscripten');env['PKG_CONFIG_LIBDIR']=str(base/'build/prefix/lib/pkgconfig');env['PKG_CONFIG_PATH']=env['PKG_CONFIG_LIBDIR']
entry=next(x for x in json.load(open(base/'build/obj-mpv/compile_commands.json')) if x['file'].endswith('player/client.c'))
args=shlex.split(entry['command']);args=args[:args.index('-MD')];args+=['-c',str(repo/'experiments/mpv-subtitle-service/bridge.c'),'-o',str(out/'bridge.o')]
subprocess.run(args,cwd=entry['directory'],env=env,check=True)
libs=shlex.split(subprocess.check_output(['pkg-config','--libs','--cflags','--static','mpv'],env=env,text=True))
args=[args[0],'-O2','-pthread','-msimd128','-I'+str(repo/'native'),'-I'+str(base/'build/sources/mpv'),'-I'+str(base/'build/obj-mpv'),str(out/'bridge.o'),str(repo/'experiments/retained-subtitles/subtitles.c'),str(repo/'native/stream_bridge.c'),*libs,'-lstdc++','-fexceptions','-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=worker','-sPTHREAD_POOL_SIZE=4','-sINITIAL_MEMORY=67108864','-sMAXIMUM_MEMORY=536870912','-sALLOW_MEMORY_GROWTH=1','-sSTACK_SIZE=2097152','-sDEFAULT_PTHREAD_STACK_SIZE=2097152','-sWASM_BIGINT=1','-sWASMFS=1','-sFORCE_FILESYSTEM=1','-sEXIT_RUNTIME=0', '-sEXPORTED_FUNCTIONS=["_malloc","_free"]','-sEXPORTED_RUNTIME_METHODS=["ccall","FS","HEAPU8","HEAP32","UTF8ToString","PThread"]','-o',str(out/'service.mjs')]
(out/'link-command.json').write_text(json.dumps(args,indent=2));subprocess.run(args,cwd=base,env=env,check=True)
