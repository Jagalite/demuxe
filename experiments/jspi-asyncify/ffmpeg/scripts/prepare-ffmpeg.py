#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Prepare a standalone FFmpeg non-pthread build outside Demuxe. Not full-build-qualified.
Reads immutable Git inputs and a hash-verified archive; does not edit the checkout.
"""
import argparse,difflib,hashlib,json,pathlib,shutil,subprocess,tarfile
BASE='a563f34571f6d319c8a919045b50920624710b00'
REMUX_BLOB='20d85a8de872247ba5ada5fdcf32db6015b6e68b'
ROOT=pathlib.Path(__file__).resolve().parents[2]
OLD='''EM_JS(int, source_read, (uint8_t *dst, int count, double offset), {
 const h=new Int32Array(Module.io,0,16),v=new DataView(Module.io);
 if(Atomics.load(h,4))return -1;
 v.setFloat64(32,offset,true);Atomics.store(h,2,count);Atomics.store(h,0,1);Atomics.notify(h,0);
 while(Atomics.load(h,0)===1){if(Atomics.load(h,4))return -1;Atomics.wait(h,0,1,100);}
 const n=Atomics.load(h,3);if(Atomics.load(h,0)!==2||n<0||n>count)return -1;
 HEAPU8.set(new Uint8Array(Module.io,64,n),dst);Atomics.store(h,0,0);return n;
});'''
NEW='''EM_ASYNC_JS(int, source_read, (uint8_t *dst, int count, double offset), {
 // The single-owner bridge validates/copies bytes and rechecks cancellation.
 try { return await Module.nonIsolatedRead(dst, count, offset); }
 catch (error) { return -1; }
});'''
def patch_remux(text):
    if text.count(OLD)!=1:raise ValueError('Expected exactly one pinned FFmpeg read bridge')
    return text.replace(OLD,NEW)
def prepare(repo,out,profile,suspension='jspi',revision=BASE):
    if profile not in ('remux','transcode'):raise ValueError('Unknown FFmpeg profile')
    if suspension not in ('jspi','asyncify'):raise ValueError('Unknown suspension backend')
    repo=repo.resolve();out=out.resolve()
    if out.exists() or out==repo or repo in out.parents:raise ValueError('Use a NEW output directory OUTSIDE Demuxe')
    if out==ROOT or ROOT in out.parents:raise ValueError('Output must be outside the review package')
    revision=subprocess.check_output(['git','-C',str(repo),'rev-parse',revision+'^{commit}'],text=True).strip()
    def read(path):return subprocess.check_output(['git','-C',str(repo),'show',revision+':'+path])
    lock=json.loads(read('sources.lock.json'));name='ffmpeg-adaptation' if profile=='transcode' else 'ffmpeg'
    spec=next(x for x in lock['sources'] if x['name']==name)
    archive=repo/'build/downloads'/(name+'.tar.gz')
    if not archive.is_file():raise FileNotFoundError(archive)
    with archive.open('rb') as f:
        if hashlib.file_digest(f,'sha256').hexdigest()!=spec['sha256']:raise ValueError('FFmpeg archive hash mismatch')
    remux=read('native/remux/remux.c');blob=hashlib.sha1(b'blob '+str(len(remux)).encode()+b'\0'+remux).hexdigest()
    if revision==BASE and blob!=REMUX_BLOB:raise ValueError('Pinned remux source hash mismatch')
    patched=patch_remux(remux.decode());out.mkdir(parents=True)
    tmp=out/'extract';tmp.mkdir()
    with tarfile.open(archive) as tar:tar.extractall(tmp,filter='data')
    entries=list(tmp.iterdir())
    if len(entries)!=1 or not entries[0].is_dir():raise ValueError('Unexpected archive structure')
    shutil.move(entries[0],out/'source');tmp.rmdir()
    patches='patches/ffmpeg-adaptation' if profile=='transcode' else 'patches/ffmpeg'
    paths=subprocess.check_output(['git','-C',str(repo),'ls-tree','-r','--name-only',revision,patches],text=True).splitlines()
    for path in paths:
        if path.endswith('.patch'):
            target=out/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(read(path))
            subprocess.run(['patch','--batch','--forward','-p1','-i',str(target)],cwd=out/'source',check=True)
    (out/'native/remux').mkdir(parents=True);(out/'native/adaptation').mkdir()
    (out/'native/remux/remux.c').write_text(patched);(out/'native/adaptation/flac.h').write_bytes(read('native/adaptation/flac.h'))
    (out/'ffmpeg-read.patch').write_text(''.join(difflib.unified_diff(remux.decode().splitlines(True),patched.splitlines(True),fromfile='a/native/remux/remux.c',tofile='b/native/remux/remux.c')))
    (out/'inputs.json').write_text(json.dumps({'demuxeRevision':revision,'source':spec,'profile':profile,'suspension':suspension,'fullBuildTested':False,'productionModified':False},indent=2)+'\n')
    shutil.copy2(ROOT/'ffmpeg/scripts/build-ffmpeg.py',out/'build-ffmpeg.py')
    shutil.copy2(ROOT/'ffmpeg/scripts/suspension_profile.py',out/'suspension_profile.py')
    shutil.copy2(ROOT/'scripts/audit-wasm.mjs',out/'audit-wasm.mjs')
    print(out)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--repo',type=pathlib.Path,required=True);p.add_argument('--out',type=pathlib.Path,required=True);p.add_argument('--profile',choices=['remux','transcode'],default='remux');p.add_argument('--suspension',choices=['jspi','asyncify'],default='jspi');p.add_argument('--revision',default=BASE);a=p.parse_args();prepare(a.repo,a.out,a.profile,a.suspension,a.revision)
