#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify immutable delivered files and scoped build/test evidence. No tests or downloads run."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path, PurePosixPath
import ast,hashlib,json
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'scripts'))
from result_contract import validate_result
def require(ok,message):
    if not ok:raise ValueError(message)
def load(name):
    value=json.loads((ROOT/name).read_text())
    require(isinstance(value,dict),'Expected object: '+name);return value
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def source_names(path):
    tree=ast.parse((ROOT/path).read_text())
    return next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign)
      and any(isinstance(x,ast.Name) and x.id=='NAMES' for x in n.targets))
def source_check(record):
    require(isinstance(record.get('sourceSHA256'),dict) and record['sourceSHA256'],'Missing source correspondence')
    for name,wanted in record['sourceSHA256'].items():
        require(digest(ROOT/name)==wanted,'Source/evidence mismatch: '+name)
def verify():
    manifest=load('MANIFEST.json')
    require(manifest.get('schema')==2,'Unknown manifest schema')
    files=manifest.get('files');require(isinstance(files,dict) and files,'Missing manifest')
    for name,record in files.items():
        rel=PurePosixPath(name)
        require(name and not rel.is_absolute() and '..' not in rel.parts and '\\' not in name,'Unsafe manifest path')
        path=ROOT.joinpath(*rel.parts)
        require(path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(ROOT),'Missing/linked/escaped path: '+name)
        require(path.stat().st_size==record['bytes'] and digest(path)==record['sha256'],'File changed: '+name)
    actual={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
    require(actual==set(files)|{'MANIFEST.json'},'Unexpected files: keep an untouched verification copy')
    require(not any(Path(x).suffix.lower() in {'.ttf','.otf','.ttc','.woff','.woff2'} for x in actual),'Font found')
    summary=load('results/REVIEW_SUMMARY.json')
    for key in ['fullEmscriptenBuilt','fullLibmpvExecuted','fullFFmpegExecuted','subtitlePixelsProduced',
                'audioOutputExecuted','productionModified','httpDeploymentQualified','otherBrowsersQualified']:
        require(summary.get(key) is False,'Unsupported qualification claim: '+key)
    for name,wanted in summary['upstreamBlobHashes'].items():
        data=(ROOT/name).read_bytes()
        require(hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==wanted,'Upstream identity mismatch')
    build=load('results/build.json')
    require(build.get('status')=='built' and len(build.get('artifacts',{}))==9,'Missing nine-fixture build')
    require(all(x.get('returncode')==0 for x in build['commands']),'Build command failed')
    source_check(build)
    for name,record in build['artifacts'].items():
        require(digest(ROOT/name)==record['sha256'] and (ROOT/name).stat().st_size==record['bytes'],'Binary/build mismatch: '+name)
        require(build['audits'][name]['privateMemory'] is True,'Missing private-memory audit')
        require(build['audits'][name]['sha256']==record['sha256'],'Wrong audit binary')
    tools=load('TOOLCHAIN.lock.json')
    require(build['wasmOptSHA256']==tools['reviewWasmOptSHA256'],'Wrong Binaryen tool identity')
    require(tools['artifactSHA256']==tools['downloadedArchiveSHA256'],'Original Binaryen archive mismatch')

    expected=set()
    for backend in ['jspi','asyncify']:
        for suite,script in [('units','run-units.py'),('range','stage2/scripts/run-bridge.py')]:
            expected|={(backend,suite,name,False) for name in source_names(script)}
            expected.add((backend,suite,'negative-no-linear-stack-switch' if suite=='units'
                         else 'cancel-after-ready-before-c-owner-resume',True))
    final=load('results/review-dual-final.json');source_check(final)
    require(final.get('total')==94 and final.get('passed')==94 and len(final['runs'])==94,'Incomplete primary suite')
    require(final['browser']==summary['browser'],'Browser mismatch')
    seen=set()
    artifacts={('jspi','units'):'artifacts/mpv-coop-units.wasm',
       ('asyncify','units'):'artifacts/mpv-coop-units.asyncify.wasm',
       ('jspi','range'):'stage2/artifacts/range-bridge.wasm',
       ('asyncify','range'):'artifacts/range-bridge.asyncify.wasm'}
    for run in final['runs']:
        key=(run['backend'],run['suite'],run['name'],run['negative'])
        require(key not in seen and key in expected,'Duplicate/unknown primary case');seen.add(key)
        require(run.get('qualified') is True,'Failed primary case')
        good,errors=validate_result(*key[:2],key[3],key[2],run['result'])
        require(good,'Bad primary result: '+str(errors))
        require(run['wasmSHA256']==build['artifacts'][artifacts[key[:2]]]['sha256'],'Primary run binary mismatch')
    require(seen==expected,'Missing primary cases')

    extra=load('results/review-continuations.json');source_check(extra)
    require(extra.get('total')==27 and extra.get('passed')==27 and len(extra['runs'])==27,'Incomplete extra suite')
    expected={(b,n,False) for b in ['jspi','asyncify'] for n in source_names('review/run-continuations.py')}
    expected|={('asyncify','saved-stack-canary-is-fatal',False),('asyncify','undersized-saved-stack-fails-closed',False),
               ('asyncify','indirect-callback-instrumented',True)}
    seen=set()
    for run in extra['runs']:
        key=(run['backend'],run['name'],run['negative'])
        require(key not in seen and key in expected,'Duplicate/unknown extra case');seen.add(key)
        require(run.get('qualified') is True,'Failed extra case')
        require(run['wasmSHA256']==build['artifacts'][run['artifact']]['sha256'],'Extra binary mismatch')
        r=run['result'];require(r['backend']==key[0],'Extra backend mismatch')
        require(r.get('crossOriginIsolated') is False and r.get('sharedArrayBufferAvailable') is False
                and r.get('memoryType')=='ArrayBuffer','Extra private-memory proof missing')
        require(r.get('nestedWorkersCreated')==0 and r.get('jspiGetterAccesses')==0,'Forbidden runtime access')
        if key[0]=='asyncify':require(r.get('jspiDisabled') is True,'Extra JSPI not disabled')
        require(r.get('stats',{}).get('continuations',{}).get('kind')==key[0],'Wrong actual extra driver')
        if key[2]:
            require(r.get('ok') is False and 'continuation side effects repeated' in r.get('error',''),'Wrong omitted-import negative')
        else:
            require(r.get('ok') is True,'Failed extra oracle')
            stats=r['stats']
            for name in ['liveTasks','retainedTasks','waitKeys','timers']:
                require(stats.get(name)==0,'Leaked extra scheduler state')
            if r.get('discarded'):
                require(stats.get('stopped') is True and stats.get('freeSlots')==0,'Fatal instance not discarded')
            else:
                require(stats.get('stopped') is False and stats.get('freeSlots')==24 and stats.get('abandoned')==0,
                        'Successful extra case lost execution')
    require(seen==expected,'Missing extra cases')
    source_check(load('results/review-host-inputs.json'))
    for name,count in [('results/review-host-after.json',11),('results/ffmpeg-no-jspi-host.json',8),('results/review-audit.json',7)]:
        r=load(name);require(r.get('passed')==count and r.get('total')==count and len(r['tests'])==count,'Incomplete host tests')
        require(len({x['name'] for x in r['tests']})==count and all(x.get('ok') is True for x in r['tests']),'Host failure/duplicate')
    for name,count in [('results/profiles.json',17),('results/review-contracts.json',15)]:
        r=load(name);require(r.get('tests')==count and r.get('errors')==0 and r.get('failures')==0,'Failed guards')
    before=load('results/review-before-fixes.json')
    require(before['total']==5 and before['passed']==0,'Missing original failure record')
    print(f"Verified {len(files)} files, pinned mpv sources and nine source/build/run binary identities.")
    print("Expected browser outcomes: 121/121, including 5 deliberate negative controls.")
    print("Host/build/audit checks: 58/58. Full Emscripten/libmpv/FFmpeg media qualification: NOT established.")
if __name__=='__main__':
    try:verify()
    except (ValueError,KeyError,TypeError,OSError,StopIteration) as e:
        print('VERIFICATION FAILED:',e,file=sys.stderr);sys.exit(1)
