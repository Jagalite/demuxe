#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Install hash-verified, provenance-bound local private mpv service builds."""
import argparse,hashlib,json,pathlib,shutil,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'experiments/jspi-asyncify/mpv/scripts'))
from evidence import verify_build

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def install(builds,runtime_root):
    pending=[]
    for profile in ('subtitles','audio'):
        build=builds/f'mpv-review-{profile}-01'
        record=json.loads((build/'result.json').read_text())
        verify_build(record,profile)
        for name,wanted in record['artifacts'].items():
            if digest(build/name)!=wanted:raise ValueError('Private mpv artifact drift: '+name)
        for backend in ('jspi','asyncify'):
            target=runtime_root/'web'/f'engine-mpv-{profile}-{backend}'
            if target.exists():raise ValueError('Refusing to replace existing private mpv assets: '+str(target))
            names={'service.mjs':'service.mjs','service.wasm':'service.asyncify.wasm' if backend=='asyncify' else 'service.wasm'}
            pending.append((build,target,profile,backend,names))
    for build,target,profile,backend,names in pending:
        target.mkdir(parents=True)
        for dest,src in names.items():shutil.copyfile(build/src,target/dest)
        (target/'manifest.json').write_text(json.dumps({'schema':1,'backend':backend,'profile':profile,
            'buildRecordSHA256':digest(build/'result.json'),'files':{dest:digest(build/src) for dest,src in names.items()},
            'qualification':'Restricted private mpv service component; full Player qualification recorded separately.'},indent=2)+'\n')
        print(target)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--builds',type=pathlib.Path,required=True);p.add_argument('--runtime-root',type=pathlib.Path,required=True)
    a=p.parse_args();install(a.builds.resolve(),a.runtime_root.resolve())
