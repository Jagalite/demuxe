#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Preserve the failed first full compile and apply its narrow header fix."""
import argparse,hashlib,json,os,pathlib,shutil,subprocess
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main(a):
    out=a.build.resolve();state=json.loads((out/'build-result.json').read_text())
    if state['status']!='failed' or 'ninja'!=state['commands'][-1]['argv'][0]:raise ValueError('Expected failed mpv compile')
    log=(out/'logs'/state['commands'][-1]['log']).read_text()
    if "undeclared function 'talloc'" not in log:raise ValueError('Different compile failure')
    for name,wanted in state['inputSHA256'].items():
        if digest(out/name)!=wanted:raise ValueError('Original input drift')
    header=out/'sources/mpv/osdep/threads-coop.h'
    original=out/'inputs/experiments/jspi-asyncify/runtime/threads-coop.h'
    if header.read_bytes()!=original.read_bytes():raise ValueError('Unexpected header changes')
    (out/'attempts').mkdir();shutil.copyfile(out/'build-result.json',out/'attempts/initial-failure.json')
    shutil.copyfile(__file__,out/'attempts/resume-header-build.py')
    header.write_text(header.read_text().replace('#pragma once','#pragma once\n#include "common/common.h"'))
    state['headerFix']={'reason':'Preserve threads-posix.h transitive common declarations for actual mpv callers',
                        'sourceSHA256':digest(header),'driverSHA256':digest(pathlib.Path(__file__)),'originalFailure':'attempts/initial-failure.json'}
    env={**os.environ,'EM_CONFIG':str(out/'emscripten.config'),'EM_CACHE':str(out/'em-cache'),'PATH':str(a.sdk.resolve()/'upstream/emscripten')+os.pathsep+str(a.tools.resolve())+os.pathsep+os.environ['PATH'],'PKG_CONFIG_LIBDIR':str(out/'prefix/lib/pkgconfig'),'PKG_CONFIG_PATH':''};env.pop('EMMAKEN_CFLAGS',None)
    state['status']='resuming'
    try:
        for command in [['ninja','-C',str(out/'objects/mpv'),'-j','4'],['meson','install','-C',str(out/'objects/mpv')]]:
            name=f'{len(state["commands"])+1:03d}.log';entry={'argv':command,'cwd':str(out),'log':name};state['commands'].append(entry)
            (out/'build-result.json').write_text(json.dumps(state,indent=2)+'\n')
            with (out/'logs'/name).open('w') as f:entry['returncode']=subprocess.run(command,env=env,cwd=out,stdout=f,stderr=subprocess.STDOUT).returncode
            if entry['returncode']:raise RuntimeError('Failed '+name)
        state['archives']={str(p.relative_to(out)):digest(p) for p in (out/'prefix/lib').glob('*.a')}
        state['status']='built_dependencies_only'
    except Exception as error:state.update(status='failed',error=str(error));raise
    finally:(out/'build-result.json').write_text(json.dumps(state,indent=2)+'\n')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--build',type=pathlib.Path,required=True);p.add_argument('--sdk',type=pathlib.Path,required=True);p.add_argument('--tools',type=pathlib.Path,required=True);main(p.parse_args())
