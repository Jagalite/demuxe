# SPDX-License-Identifier: MIT
from common import *
import numpy as np
sr=48000;rng=np.random.default_rng(146263)
a=rng.integers(-3000000,3000000,(60013,2),dtype=np.int32);b=rng.integers(-2800000,2800000,(50027,2),dtype=np.int32)
# Deterministic broadband sample-identity witnesses; not representative music.
def make(n,x):
 (F/(n+'.s32')).write_bytes((x.astype(np.int64)*256).astype('<i4').tobytes())
 (F/(n+'.f32')).write_bytes((x.astype(np.float64)/8388608).astype('<f4').tobytes())
 ff('-f','s32le','-ar',sr,'-ac',2,'-i',F/(n+'.s32'),'-c:a','flac','-sample_fmt','s32','-frame_size','1024',F/(n+'.flac'))
 decoded=ff('-i',F/(n+'.flac'),'-f','s32le','-acodec','pcm_s32le','-');assert decoded==(x.astype(np.int64)*256).astype('<i4').tobytes()
 ff('-i',F/(n+'.flac'),'-c','copy','-strict','-2','-movflags','+empty_moov+default_base_moof+frag_keyframe','-frag_duration','100000',F/(n+'.mp4'))
 info=split(n);info.update(frames=len(x),float_hash=sha((F/(n+'.f32')).read_bytes()))
 # Ensure actual packet payload bytes survived FLAC -> MP4
 orig=packet_summary(n+'.flac');out=packet_summary(n+'.mp4');assert [p['data_hash'] for p in orig]==[p['data_hash'] for p in out]
 info['packets']=len(out);info['packet_payloads_preserved']=True;return info
sources={'a':make('a',a),'b':make('b',b)}
cuts=[[1001,48037],[8192,40000],[15001,15129]]
for i,(lo,hi) in enumerate(cuts):sources[f'clip{i}']=make(f'clip{i}',a[lo:hi])
plan=[{'source':'a','a':1001,'b':31002},{'source':'b','a':3007,'b':28013},{'source':'a','a':40009,'b':59011}]
assembled=np.concatenate([(a if x['source']=='a' else b)[x['a']:x['b']] for x in plan]);sources['joined']=make('joined',assembled)
save('audio_manifest.json',{'sample_rate':sr,'channels':2,'cuts':cuts,'plan':plan,'sources':sources,'joined_frames':len(assembled),'fixture':'seeded broadband S24, independent source-aware slice oracle'})
print({k:(v['frames'],v['packets']) for k,v in sources.items()})
