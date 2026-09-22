# SPDX-License-Identifier: MIT
"""Bounded, source-bound fMP4 run-table author. No media decoding in constructor."""
from common import *
from fractions import Fraction
import numpy as np

U=lambda n:struct.pack('>I',n)
def box(t,p): return U(len(p)+8)+t.encode()+p
def full(t,v,flags,p):return box(t,bytes([v])+flags.to_bytes(3,'big')+p)
def children(b,q):return boxes(b,q[3],q[2])
def only(b,q,name):
 a=[x for x in children(b,q) if x[0]==name]
 if len(a)!=1:raise ValueError('missing/ambiguous '+name)
 return a[0]
def num(b,p,n=4,signed=False):return int.from_bytes(b[p:p+n],'big',signed=signed)

def inspect(b):
 top=boxes(b); m=next(q for q in top if q[0]=='moov'); init=b[:next(q[1] for q in top if q[0]=='moof')]
 info={}
 for tr in [q for q in children(b,m) if q[0]=='trak']:
  tk=only(b,tr,'tkhd');p=tk[3];tid=num(b,p+(20 if b[p] else 12))
  md=only(b,tr,'mdia');mh=only(b,md,'mdhd');p=mh[3];scale=num(b,p+(20 if b[p] else 12))
  h=only(b,md,'hdlr');kind=b[h[3]+8:h[3]+12].decode();info[tid]={'id':tid,'scale':scale,'kind':kind,'samples':[]}
 for moof in [q for q in top if q[0]=='moof']:
  for traf in [q for q in children(b,moof) if q[0]=='traf']:
   tf=only(b,traf,'tfhd');p=tf[3];flags=num(b,p+1,3);tid=num(b,p+4);p+=8
   if flags&1:raise ValueError('absolute offset excluded')
   if not flags&0x020000:raise ValueError('default-base-is-moof required')
   if flags&2:p+=4
   defaults={}
   for f,k in [(8,'duration'),(16,'size'),(32,'flags')]:
    if flags&f:defaults[k]=num(b,p);p+=4
   td=only(b,traf,'tfdt');p=td[3];dts=num(b,p+4,8 if b[p] else 4)
   cursor=None
   for trun in [q for q in children(b,traf) if q[0]=='trun']:
    p=trun[3];version=b[p];fl=num(b,p+1,3);count=num(b,p+4);p+=8
    if fl&1:cursor=moof[1]+num(b,p,4,True);p+=4
    if cursor is None:raise ValueError('run lacks initial address')
    first=None
    if fl&4:first=num(b,p);p+=4
    for i in range(count):
     rec={'dts':dts,'cto':0,'track':tid}
     for f,k in [(0x100,'duration'),(0x200,'size'),(0x400,'flags'),(0x800,'cto')]:
      if fl&f:rec[k]=num(b,p,4,version==1 and k=='cto');p+=4
      elif k in defaults:rec[k]=defaults[k]
     if i==0 and first is not None:rec['flags']=first
     if rec.get('duration',0)<=0 or rec.get('size',0)<=0:raise ValueError('invalid sample')
     rec['payload']=b[cursor:cursor+rec['size']];rec['source_offset']=cursor
     if len(rec['payload'])!=rec['size']:raise ValueError('short sample')
     if not any(q[0]=='mdat' and q[3]<=cursor and cursor+rec['size']<=q[2] for q in top):raise ValueError('not inside mdat')
     info[tid]['samples'].append(rec);cursor+=rec['size'];dts+=rec['duration']
 return init,info

def construct(info,layout):
 tracks=sorted(info)
 if layout=='grouped':runs=[(tid,info[tid]['samples']) for tid in tracks]
 elif layout=='quarter':
  buckets={}
  for tid in tracks:
   for s in info[tid]['samples']:
    k=int(Fraction(s['dts'],info[tid]['scale'])*4);buckets.setdefault((k,tid),[]).append(s)
  runs=[(tid,s) for (k,tid),s in sorted(buckets.items())]
 else:raise ValueError('unknown layout')
 payload=b'';run_records=[]
 for tid,ss in runs:
  off=len(payload);data=b''.join(s['payload'] for s in ss);payload+=data
  run_records.append({'tid':tid,'samples':ss,'offset':off,'end':len(payload)})
 def moof(header_len):
  trafs=[]
  for tid in tracks:
   track=info[tid];rr=[r for r in run_records if r['tid']==tid];rdata=[]
   for r in rr:
    # Explicit signed CTOs and every sample field. No implicit inherited defaults.
    vals=b''.join(U(s['duration'])+U(s['size'])+U(s['flags'])+struct.pack('>i',s['cto']) for s in r['samples'])
    rdata.append(full('trun',1,0xf01,U(len(r['samples']))+struct.pack('>i',header_len+8+r['offset'])+vals))
   trafs.append(box('traf',full('tfhd',0,0x020000,U(tid))+full('tfdt',1,0,struct.pack('>Q',track['samples'][0]['dts']))+b''.join(rdata)))
  return box('moof',full('mfhd',0,0,U(1))+b''.join(trafs))
 h=moof(0);h=moof(len(h));out=h+box('mdat',payload)
 # Head ends after all complete runs whose last DTS is below .75 sec.
 head_runs=[r for r in run_records if Fraction(r['samples'][0]['dts'],info[r['tid']]['scale'])<Fraction(3,4)]
 head=len(h)+8+max(r['end'] for r in head_runs)
 return out, {'moof_bytes':len(h),'payload_bytes':len(payload),'run_count':len(runs),'first_three_quarters_prefix_bytes':head,'runs':[{'track':r['tid'],'samples':len(r['samples']),'offset':len(h)+8+r['offset'],'end':len(h)+8+r['end'],'first_dts':r['samples'][0]['dts']} for r in run_records]}

def essence(p):
 x=json.loads(run(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',p]))['packets']
 return [{k:r.get(k) for k in ['stream_index','pts','dts','duration','size','data_hash']} for r in x]
def canon_packets(x):return sorted(x,key=lambda r:(r['stream_index'],int(r['dts'])))
def main():
 # Authored changing video and independently marked stereo tones.
 sr=48000;n=sr*3;t=np.arange(n)/sr
 l=.22*np.sin(2*np.pi*503*t)*(0.35+0.65*(t%1<.6));r=.19*np.sin(2*np.pi*941*t)*(0.45+0.55*(t%1>=.2))
 pcm=np.column_stack([l,r]).astype('<f4');(F/'tones.f32').write_bytes(pcm.tobytes())
 ff('-f','lavfi','-i','testsrc2=size=192x112:rate=25:duration=3','-f','f32le','-ar',sr,'-ac',2,'-i',F/'tones.f32','-c:v','libx264','-threads','1','-preset','fast','-crf','20','-g','25','-bf','2','-x264-params','keyint=25:min-keyint=25:scenecut=0:open-gop=0','-pix_fmt','yuv420p','-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-c:a','aac','-b:a','144k','-movflags','+empty_moov+default_base_moof+negative_cts_offsets','-frag_duration','100000000','-t','3',F/'source.mp4')
 src=(F/'source.mp4').read_bytes();init,info=inspect(src);(F/'av.init').write_bytes(init)
 manifest={'source_sha256':sha(src),'source_bytes':len(src),'init_bytes':len(init),'tracks':{},'layouts':{}}
 for tid,tr in info.items():
  manifest['tracks'][tid]={'kind':tr['kind'],'scale':tr['scale'],'sample_count':len(tr['samples']),'dts0':tr['samples'][0]['dts'],'sample_bytes':sum(s['size'] for s in tr['samples']),'duration_ticks':sum(s['duration'] for s in tr['samples']),'payload_sha256':sha(b''.join(s['payload'] for s in tr['samples']))}
 for layout in ['grouped','quarter']:
  frag,meta=construct(info,layout);(F/f'{layout}.m4s').write_bytes(frag);(F/f'{layout}.mp4').write_bytes(init+frag)
  # Re-read output with independent ffprobe. Ordering normalized per track, not across tracks.
  ref=canon_packets(essence(F/'source.mp4'));out=canon_packets(essence(F/f'{layout}.mp4'))
  core=lambda a:[{k:v for k,v in r.items() if k!='duration'} for r in a]
  _,parsed=inspect(init+frag)
  fields=('dts','cto','duration','size','flags','payload')
  table_same=all([[tuple(s[k] for k in fields) for s in info[t]['samples']]==[tuple(s[k] for k in fields) for s in parsed[t]['samples']] for t in info])
  meta.update(packet_identity=core(ref)==core(out),raw_sample_table_identity=table_same,all_ffprobe_fields_equal=ref==out,ffprobe_field_differences=[{'reference':a,'candidate':b} for a,b in zip(ref,out) if a!=b],packet_count=len(out),fragment_bytes=len(frag),sha256=sha(frag))
  for stream,fmt,args in [('video','yuv',['-map','0:v:0','-fps_mode','passthrough','-pix_fmt','yuv420p','-f','rawvideo']),('audio','f32',['-map','0:a:0','-acodec','pcm_f32le','-f','f32le'])]:
   base=run(['ffmpeg','-v','error','-i',F/'source.mp4',*args,'-']);cand=run(['ffmpeg','-v','error','-i',F/f'{layout}.mp4',*args,'-'])
   meta[stream+'_decoded_exact']=base==cand;meta[stream+'_decoded_bytes']=len(base);meta[stream+'_sha256']=sha(cand)
   (F/f'{layout}.{fmt}').write_bytes(cand)
  manifest['layouts'][layout]=meta
 # Reference split into ordinary one-second fragments for duplicate tests: stream-copy original video only.
 ff('-i',F/'source.mp4','-map','0:v:0','-c','copy','-movflags','+empty_moov+default_base_moof+frag_keyframe+negative_cts_offsets',F/'ledger.mp4')
 manifest['ledger']=split('ledger');manifest['ledger']['targets']=[.10,.54,1.10,1.54,2.10,2.54,.38];manifest['ledger']['mime']='video/mp4; codecs="avc1.64000b"'
 avcc=src.find(b'avcC');conf=src[avcc+5:avcc+8].hex();manifest['mime']=f'video/mp4; codecs="avc1.{conf},mp4a.40.2"';manifest['ledger']['mime']=f'video/mp4; codecs="avc1.{conf}"'
 save('manifest.json',manifest);print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
