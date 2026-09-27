#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
import argparse,hashlib,json,os,pathlib,shutil,subprocess
EXP=pathlib.Path(__file__).resolve().parents[2]
def main(a):
    out=a.out.resolve();out.mkdir(parents=True,exist_ok=False);sdk=a.sdk.resolve()
    config=out/'em.config';config.write_text(f'LLVM_ROOT={str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT={str(sdk/"upstream")!r}\nNODE_JS={shutil.which("node")!r}\nCACHE={str(out/"cache")!r}\n')
    env={**os.environ,'EM_CONFIG':str(config),'EM_CACHE':str(out/'cache')};env.pop('EMMAKEN_CFLAGS',None)
    (out/'include/osdep').mkdir(parents=True)
    shutil.copyfile(EXP/'tests/support/osdep/timer.h',out/'include/osdep/timer.h')
    exports=['context_probe','demuxe_context_errno','demuxe_context_enter','demuxe_context_stack_base','demuxe_context_stack_end','demuxe_coop_invoke','demuxe_coop_get_sp','demuxe_coop_set_sp','demuxe_coop_stack_base','demuxe_coop_stack_top','demuxe_coop_stack_count','demuxe_asyncify_count','demuxe_asyncify_data','demuxe_asyncify_base','demuxe_asyncify_end']
    sources=[EXP/n for n in ['runtime/threads-coop.c','runtime/stack.s','runtime/asyncify-stacks.c','mpv/native/context.c','mpv/tests/context-probe.c']]
    adapted=out/'threads-coop.c';adapted.write_text(sources[0].read_text().replace('import_name(#name)','import_name("demuxe_coop_" #name)'));sources[0]=adapted
    commands=[list(map(str,[sdk/'upstream/emscripten/emcc','-O2','-g','-I'+str(EXP/'runtime'),'-I'+str(out/'include'),*sources,'-sMODULARIZE=1','-sEXPORT_ES6=1','-sENVIRONMENT=worker,node','-sALLOW_MEMORY_GROWTH=1','-sINITIAL_MEMORY=33554432','-sMAXIMUM_MEMORY=134217728','-sSTACK_SIZE=2097152','-sSTACK_OVERFLOW_CHECK=0','-sFILESYSTEM=0','-sASSERTIONS=1','-sEXPORTED_FUNCTIONS='+json.dumps(['_'+n for n in exports]),'-sEXPORTED_RUNTIME_METHODS=["HEAPU8"]','-Wl,--export-memory','-o',out/'probe.mjs'])),
        list(map(str,[sdk/'upstream/bin/wasm-opt',out/'probe.wasm','--asyncify','--pass-arg=asyncify-imports@demuxe_coop.demuxe_coop_wait,demuxe_coop.demuxe_coop_join,demuxe_coop.demuxe_coop_yield','--enable-bulk-memory','--enable-nontrapping-float-to-int','--enable-sign-ext','-g','-o',out/'probe.asyncify.wasm']))]
    commands[0][1:1]=['--js-library',str(EXP/'mpv/runtime/imports.js')]
    record={'commands':[],'sourceSHA256':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}}
    try:
        for i,argv in enumerate(commands):
            r=subprocess.run(argv,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
            (out/f'{i+1}.log').write_text(r.stdout);record['commands'].append({'argv':argv,'returncode':r.returncode})
            if r.returncode:raise RuntimeError(r.stdout[-6000:])
        record['status']='built';record['artifacts']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.glob('probe.*')}
    except Exception as error:record.update(status='failed',error=str(error));raise
    finally:(out/'result.json').write_text(json.dumps(record,indent=2)+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--sdk',type=pathlib.Path,required=True);main(p.parse_args())
