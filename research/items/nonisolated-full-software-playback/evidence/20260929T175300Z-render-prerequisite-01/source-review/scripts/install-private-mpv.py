#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Install hash-verified, provenance-bound local private mpv service builds."""
import argparse,hashlib,json,pathlib,shutil,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'experiments/jspi-asyncify/mpv/scripts'))
from evidence import verify_build

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def install(builds,runtime_root,subtitles_build=None,replace=False):
    pending=[]
    for profile in (('subtitles',) if subtitles_build else ('subtitles','audio')):
        build=subtitles_build if subtitles_build else builds/f'mpv-review-{profile}-01'
        record=json.loads((build/'result.json').read_text())
        verify_build(record,profile)
        for name,wanted in record['artifacts'].items():
            if digest(build/name)!=wanted:raise ValueError('Private mpv artifact drift: '+name)
        for backend in ('jspi','asyncify'):
            target=runtime_root/'web'/f'engine-mpv-{profile}-{backend}'
            if target.exists():
                if not replace:raise ValueError('Refusing to replace existing private mpv assets: '+str(target))
                previous=json.loads((target/'manifest.json').read_text())
                if previous.get('profile')!=profile or previous.get('backend')!=backend:raise ValueError('Installed private mpv identity mismatch')
                for name in ('service.mjs','service.wasm'):
                    if digest(target/name)!=previous['files'][name]:raise ValueError('Installed private mpv asset drift: '+str(target/name))
            names={'service.mjs':'service.mjs','service.wasm':'service.asyncify.wasm' if backend=='asyncify' else 'service.wasm'}
            pending.append((build,target,profile,backend,names))
    for build,target,profile,backend,names in pending:
        target.mkdir(parents=True,exist_ok=replace)
        for dest,src in names.items():shutil.copyfile(build/src,target/dest)
        (target/'manifest.json').write_text(json.dumps({'schema':1,'backend':backend,'profile':profile,
            'buildRecordSHA256':digest(build/'result.json'),'files':{dest:digest(build/src) for dest,src in names.items()},
            'qualification':'Restricted private mpv service component; full Player qualification recorded separately.'},indent=2)+'\n')
        print(target)
if __name__=='__main__':
    p=argparse.ArgumentParser();sources=p.add_mutually_exclusive_group(required=True);sources.add_argument('--builds',type=pathlib.Path);sources.add_argument('--subtitles-build',type=pathlib.Path);p.add_argument('--replace',action='store_true');p.add_argument('--runtime-root',type=pathlib.Path,required=True)
    a=p.parse_args();install(a.builds.resolve() if a.builds else None,a.runtime_root.resolve(),a.subtitles_build.resolve() if a.subtitles_build else None,a.replace)
