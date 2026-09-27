#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Relink verified private FFmpeg libraries into a NEW, independently recorded prefix."""
import argparse,datetime,hashlib,json,os,pathlib,shutil,subprocess

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify_relink_inputs(source,previous):
    source=source.resolve()
    # Legacy records cannot prove which archives produced the original engine.
    hashes=previous.get('relinkInputsSHA256')
    if not hashes or not previous.get('commandsSHA256') or not previous.get('linkCommand'):
        raise ValueError('Build lacks original relink provenance; prepare a fresh build')
    if digest(source/'commands.json')!=previous['commandsSHA256']:
        raise ValueError('Changed original build commands')
    commands=json.loads((source/'commands.json').read_text())
    links=[c['argv'] for c in commands if c['argv'][0]=='emcc']
    if links!=[previous['linkCommand']]:raise ValueError('Original link command mismatch')
    argv=links[0][:]
    libraries=[pathlib.Path(x).resolve() for x in argv if x.endswith('.a')]
    expected={source/'objects'/lib/(lib+'.a') for lib in ['libavformat','libavcodec','libswresample','libavutil']}
    if set(libraries)!=expected:raise ValueError('Unexpected link libraries')
    required=expected|{source/'objects/config.h',source/'objects/config_components.h'}
    if set(hashes)!={str(p.relative_to(source)) for p in required}:raise ValueError('Incomplete relink input hashes')
    for name,wanted in hashes.items():
        if digest(source/name)!=wanted:raise ValueError('Changed original relink input: '+name)
    return argv

def main(a):
    source=a.build.resolve();out=a.out.resolve();repo=pathlib.Path(__file__).resolve().parents[4]
    if out.exists() or out==repo or repo in out.parents:raise ValueError('Fresh external output required')
    previous=json.loads((source/'build-result.json').read_text())
    if previous['status']!='build_completed_only':raise ValueError('Successful library build required')
    for name,wanted in previous['sourceSHA256'].items():
        if digest(source/name)!=wanted:raise ValueError('Changed build source: '+name)
    for name,wanted in previous['artifacts'].items():
        if digest(source/'engine'/name)!=wanted:raise ValueError('Changed original engine: '+name)
    inputs=json.loads((source/'inputs.json').read_text())
    if inputs['profile']!='transcode':raise ValueError('FLAC policy relink requires transcode profile')
    argv=verify_relink_inputs(source,previous)
    if any(x.startswith('-DDEMUXE_FLAC_LEVEL=') for x in argv):raise ValueError('Unexpected preexisting level override')
    out.mkdir(parents=True);(out/'engine').mkdir();(out/'logs').mkdir()
    node=shutil.which('node');sdk=pathlib.Path(previous['toolchain']['sdk'])
    config=out/'emscripten.config';config.write_text(f'LLVM_ROOT = {str(sdk/"upstream/bin")!r}\nBINARYEN_ROOT = {str(sdk/"upstream")!r}\nNODE_JS = {node!r}\nCACHE = {str(out/"em-cache")!r}\n')
    env={**os.environ,'PATH':str(sdk/'upstream/emscripten')+os.pathsep+os.environ['PATH'],
         'EM_CONFIG':str(config),'EM_CACHE':str(out/'em-cache'),'EMCC_CFLAGS':'','PYTHONDONTWRITEBYTECODE':'1','SOURCE_DATE_EPOCH':'1740000000'}
    env.pop('EMMAKEN_CFLAGS',None)
    toolchain={'sdk':str(sdk),'node':subprocess.check_output([node,'--version'],text=True).strip(),
               'emcc':subprocess.check_output([str(sdk/'upstream/emscripten/emcc'),'--version'],env=env,text=True)}
    for name in ['clang','wasm-opt']:
        tool=sdk/'upstream/bin'/name
        toolchain[name]={'version':subprocess.check_output([str(tool),'--version'],text=True).strip(),'sha256':digest(tool)}
    if toolchain!=previous['toolchain']:raise ValueError('Relink toolchain differs from library build; prepare a fresh build')
    argv.insert(1,'-DDEMUXE_FLAC_LEVEL='+str(a.flac_level))
    argv=[('-Wl,-Map,'+str(out/'engine/remux.map')) if x.startswith('-Wl,-Map,') else x for x in argv]
    argv[argv.index('-o')+1]=str(out/'engine/remux.mjs')
    shutil.copyfile(pathlib.Path(__file__).resolve(),out/'relink-ffmpeg.py')
    paths=[source/'build-result.json',source/'commands.json',source/'inputs.json',source/'audit-wasm.mjs',out/'relink-ffmpeg.py',
           source/'native/remux/remux.c',source/'native/adaptation/flac.h',source/'objects/config.h',source/'objects/config_components.h']
    paths.extend(pathlib.Path(x) for x in argv if x.endswith('.a'))
    state={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'building','libraryBuild':str(source),
           'suspension':inputs['suspension'],'savedStackBytes':previous['savedStackBytes'],'mediaExecuted':False,
           'toolchain':toolchain,'linkSettings':{'flacLevel':a.flac_level},
           'sourceSHA256':{str(p):digest(p) for p in paths}}
    # Do not bless a change between preflight and snapshotting the link inputs.
    originals={**previous['sourceSHA256'],**previous['relinkInputsSHA256'],'commands.json':previous['commandsSHA256']}
    for name,wanted in originals.items():
        key=str(source/name)
        if key in state['sourceSHA256'] and state['sourceSHA256'][key]!=wanted:
            raise ValueError('Input changed after preflight: '+name)
    (out/'inputs.json').write_text(json.dumps({**inputs,'libraryBuild':str(source),'flacLevel':a.flac_level},indent=2)+'\n')
    records=[]
    def run(command,log):
        with (out/'logs'/log).open('w') as f:rc=subprocess.run(command,cwd=source/'objects',env=env,stdout=f,stderr=subprocess.STDOUT).returncode
        records.append({'argv':command,'cwd':str(source/'objects'),'returncode':rc,'log':log})
        (out/'commands.json').write_text(json.dumps(records,indent=2)+'\n')
        if rc:raise RuntimeError('Relink failed: '+log)
    try:
        run(argv,'01-link.log')
        run([node,str(source/'audit-wasm.mjs'),str(out/'engine/remux.wasm'),'--emscripten','--backend='+inputs['suspension'],'--profile=transcode'],'04.log')
        for name,wanted in state['sourceSHA256'].items():
            if digest(pathlib.Path(name))!=wanted:raise ValueError('Input changed while relinking: '+name)
        state.update(status='build_completed_only',fullFFmpegBuilt=True,artifacts={p.name:digest(p) for p in (out/'engine').iterdir()})
    except Exception as error:state.update(status='build_failed',error=str(error));raise
    finally:(out/'build-result.json').write_text(json.dumps(state,indent=2)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--build',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--flac-level',type=int,required=True);a=p.parse_args()
    if not 0<=a.flac_level<=8:p.error('FLAC level must be 0..8')
    main(a)
