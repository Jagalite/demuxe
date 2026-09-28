#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Link the actual restricted mpv subtitle service with one raw continuation owner."""
import argparse,hashlib,json,os,pathlib,re,shlex,shutil,subprocess
from provenance import verify_dependencies
REPO=pathlib.Path(__file__).resolve().parents[4]
EXP=REPO/'experiments/jspi-asyncify'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main(a):
    deps=a.deps.resolve();out=a.out.resolve();sdk=a.sdk.resolve()
    if out.exists() or REPO in out.parents:raise ValueError('Fresh external output required')
    build=verify_dependencies(deps,sdk)
    if a.profile=='audio' and build.get('profile')!='audio':raise ValueError('Audio decoder dependency build required')
    out.mkdir(parents=True);(out/'inputs').mkdir();(out/'logs').mkdir()
    files=[REPO/'native/subtitles/service.c',REPO/'native/subtitles/bitmap.c',REPO/'native/stream_bridge.h',REPO/'native/audio_bridge.h',EXP/'mpv/native/audio-service.c',
           EXP/'stage2/native/stream-coop.c',EXP/'runtime/stack.s',EXP/'runtime/asyncify-stacks.c',
           EXP/'mpv/native/context.c',EXP/'mpv/native/finite-source.c',EXP/'mpv/runtime/imports.js',pathlib.Path(__file__),pathlib.Path(__file__).with_name('provenance.py'),EXP/'scripts/audit-wasm.mjs']
    for p in files:
        dest=out/'inputs'/p.relative_to(REPO);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
    shutil.copyfile(deps/'build-result.json',out/'inputs/dependency-build.json')
    native=out/'inputs/native';local=out/'inputs/experiments/jspi-asyncify'
    p=native/'subtitles/service.c';text=p.read_text();old='emscripten_async_run_in_main_runtime_thread(EM_FUNC_SIG_V, subtitle_timing_deliver);'
    if text.count(old)!=1:raise ValueError('Unexpected timing notification bridge')
    p.write_text(text.replace(old,'subtitle_timing_deliver();').replace('#include <emscripten/threading_legacy.h>',''))
    p=local/'stage2/native/stream-coop.c';p.write_text(p.read_text().replace('import_name(#name)','import_name("demuxe_source_" #name)'))
    node=shutil.which('node');em=sdk/'upstream/emscripten';config=out/'em.config'
    config.write_text(f'LLVM_ROOT={str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT={str(sdk/"upstream")!r}\nNODE_JS={node!r}\nCACHE={str(out/"cache")!r}\n')
    env={**os.environ,'EM_CONFIG':str(config),'EM_CACHE':str(out/'cache'),'PKG_CONFIG_LIBDIR':str(deps/'prefix/lib/pkgconfig'),'PKG_CONFIG_PATH':'','EMCC_CFLAGS':''};env.pop('EMMAKEN_CFLAGS',None)
    entries=json.loads((deps/'objects/mpv/compile_commands.json').read_text());client=next(x for x in entries if x['file'].endswith('player/client.c'))
    flags=shlex.split(client['command']);flags=flags[1:flags.index('-MD')]
    libs=shlex.split(subprocess.check_output(['pkg-config','--cflags','--libs','--static','mpv'],env=env,text=True))
    if '-pthread' in [*flags,*libs]:raise ValueError('Threaded dependencies leaked into private service')
    exports=['demuxe_context_errno','demuxe_context_enter','demuxe_context_stack_base','demuxe_context_stack_end',
             'demuxe_coop_invoke','demuxe_coop_get_sp','demuxe_coop_set_sp','demuxe_coop_stack_base','demuxe_coop_stack_top','demuxe_coop_stack_count',
             'demuxe_asyncify_count','demuxe_asyncify_data','demuxe_asyncify_base','demuxe_asyncify_end','demuxe_source_live','malloc','free']
    commands=[];record={'profile':a.profile,'status':'linking','dependencyBuild':str(deps),'dependencyRecordSHA256':digest(deps/'build-result.json'),'backendOwner':'raw cooperative scheduler; no Emscripten async runtime','sourceSHA256':{str(p):digest(p) for p in (out/'inputs').rglob('*') if p.is_file()},'dependencyArchives':build['archives'],'commands':commands}
    def run(argv,name):
        argv=list(map(str,argv))
        with (out/'logs'/name).open('w') as f:rc=subprocess.run(argv,cwd=client['directory'],env=env,stdout=f,stderr=subprocess.STDOUT).returncode
        commands.append({'argv':argv,'log':name,'returncode':rc})
        if rc:raise RuntimeError('Failed '+name)
    try:
        run([em/'emcc',*flags,'-ffile-prefix-map='+str(out)+'=/demuxe-private-service','-ffile-prefix-map='+str(REPO)+'=/demuxe','-I'+str(native),*([native/'subtitles/service.c',native/'subtitles/bitmap.c'] if a.profile=='subtitles' else [local/'mpv/native/audio-service.c']),local/'stage2/native/stream-coop.c',local/'runtime/stack.s',local/'runtime/asyncify-stacks.c',local/'mpv/native/context.c',local/'mpv/native/finite-source.c',*libs,
             '--js-library',local/'mpv/runtime/imports.js','-g','-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=worker','-sALLOW_MEMORY_GROWTH=1','-sINITIAL_MEMORY=67108864','-sMAXIMUM_MEMORY=134217728','-sSTACK_SIZE=2097152','-sSTACK_OVERFLOW_CHECK=0','-sASSERTIONS=1','-sWASM_BIGINT=1','-sFORCE_FILESYSTEM=1','-sEXIT_RUNTIME=0','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+n for n in exports]),'-sEXPORTED_RUNTIME_METHODS=["FS","HEAPU8","HEAP32","UTF8ToString"]','-Wl,--export-memory','-Wl,-Map,'+str(out/'service.map'),'-o',out/'service.mjs'],'01-link.log')
        glue=(out/'service.mjs').read_text()
        if 'Asyncify' in glue:raise ValueError('An Emscripten Asyncify owner leaked into glue')
        run([sdk/'upstream/bin/wasm-opt',out/'service.wasm','--asyncify','--pass-arg=asyncify-imports@demuxe_coop.demuxe_coop_wait,demuxe_coop.demuxe_coop_join,demuxe_coop.demuxe_coop_yield,demuxe_source.demuxe_source_read','--enable-bulk-memory','--enable-nontrapping-float-to-int','--enable-sign-ext','--enable-simd','-g','-o',out/'service.asyncify.wasm'],'02-asyncify.log')
        for suffix in ['', '.asyncify']:
            run([node,local/'scripts/audit-wasm.mjs',out/('service'+suffix+'.wasm'),*(['--asyncify'] if suffix else [])],'audit'+suffix+'.json')
        for name,wanted in record['sourceSHA256'].items():
            if digest(pathlib.Path(name))!=wanted:raise ValueError('Changed link input')
        verify_dependencies(deps,sdk)
        if digest(deps/'build-result.json')!=record['dependencyRecordSHA256']:raise ValueError('Dependency record drift')
        record.update(status='built_service_only',artifacts={p.name:digest(p) for p in out.glob('service.*')})
    except Exception as error:record.update(status='failed',error=str(error));raise
    finally:(out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--profile',choices=['subtitles','audio'],default='subtitles');p.add_argument('--deps',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--sdk',type=pathlib.Path,required=True);main(p.parse_args())
