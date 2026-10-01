#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Actual material mutation controls for the isolated atomic-mpv source gate."""
import argparse, errno, hashlib, json, os, shutil, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
for n in ['old-root','native','candidate','inherited-source','relink']:p.add_argument('--'+n,type=Path,required=True)
a=p.parse_args();base={k.replace('_','-'):v for k,v in vars(a).items()}

def link(source,target):
    try:os.link(source,target)
    except OSError as e:
        if e.errno!=errno.EXDEV:raise
        shutil.copyfile(source,target)

def clone(root,dest):
    dest.mkdir()
    for f in root.iterdir():
        if f.is_file():link(f,dest/f.name)

def replace(path,data):
    if path.exists():path.unlink()
    path.write_bytes(data)

def run(name,overrides,expected,temp):
    args=[str(ROOT/'scripts/package-unified-mpv-source.py')]
    for k,v in (base|overrides).items():args+=['--'+k,str(v)]
    args+=['--output',str(temp/(name+'-output'))]
    r=subprocess.run(['python3',*args],capture_output=True,text=True)
    if r.returncode==0 or expected not in r.stderr:raise AssertionError(name+': '+r.stdout+r.stderr)
    return {'name':name,'expectedFailure':expected,'status':'PASS'}

with tempfile.TemporaryDirectory(prefix='demuxe-mpv-source-controls-') as d:
    t=Path(d);results=[]
    damaged=t/'source.tar.gz';damaged.write_bytes(b'not corresponding source')
    results.append(run('source-identity',{'inherited-source':damaged},'Unexpected inherited source identity',t))
    native=t/'native';clone(a.native,native);r=json.loads((native/'build-record.json').read_text());r['qualification']='laundered';replace(native/'build-record.json',json.dumps(r).encode())
    results.append(run('original-record',{'native':native},'Unexpected original native record identity',t))
    replay=t/'replay';clone(a.relink,replay);data=(replay/'player.mjs').read_bytes();replace(replay/'player.mjs',data+b'\n')
    results.append(run('actual-relink-bytes',{'relink':replay},'Relink output differs: player.mjs',t))
    replace(replay/'player.mjs',data);proof=json.loads((replay/'relink-proof.json').read_text());proof['librarySHA256Before'][next(iter(proof['librarySHA256Before']))]='0'*64;replace(replay/'relink-proof.json',json.dumps(proof).encode())
    results.append(run('library-hash-provenance',{'relink':replay},'Relink library differs from replay',t))
    candidate=t/'candidate';candidate.mkdir()
    for f in a.candidate.rglob('*'):
        if f.is_file():
            target=candidate/f.relative_to(a.candidate);target.parent.mkdir(parents=True,exist_ok=True);link(f,target)
    adapter=candidate/'runtime/web/engine-hybrid/player.mjs';replace(adapter,adapter.read_bytes().replace(b'_web_set_render_mode(2)',b'_web_set_render_mode(0)'))
    results.append(run('actual-mode-adapter',{'candidate':candidate},'Candidate mode adapter differs: hybrid',t))
    replace(adapter,(a.candidate/'runtime/web/engine-hybrid/player.mjs').read_bytes());wasm=candidate/'runtime/web/engine-mpv/player.wasm';replace(wasm,wasm.read_bytes()+b'\x00')
    results.append(run('actual-native-identity',{'candidate':candidate},'Candidate native engine differs: player.wasm',t))
    print(json.dumps({'schema':1,'status':'PASS','controls':results},indent=2))
