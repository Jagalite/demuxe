# SPDX-License-Identifier: Apache-2.0
# Narrow local fixture adapter, not admission for arbitrary MP4.
import pathlib,struct,json,subprocess,hashlib
r=pathlib.Path(__file__).parent

def boxes(b,start=0,end=None):
 end=len(b) if end is None else end;p=start;out=[]
 while p<end:
  if end-p<8:raise ValueError('truncated box')
  size=int.from_bytes(b[p:p+4],'big');kind=b[p+4:p+8].decode('ascii')
  if size<8 or p+size>end:raise ValueError('unsupported box size')
  out.append((kind,p,size));p+=size
 return out

def select(b,track=3):
 top=boxes(b);moov=[x for x in top if x[0]=='moov'];assert len(moov)==1
 _,offset,size=moov[0]
 if size>1024*1024:raise ValueError('moov budget')
 children=boxes(b,offset+8,offset+size)
 if any(t not in ['mvhd','trak','udta'] for t,p,n in children):raise ValueError('complex movie')
 edited=bytearray(b[offset:offset+size]);tracks=[];replacements=[];enabled=[]
 for t,p,n in children:
  if t!='trak':continue
  parts=boxes(b,p+8,p+n)
  if any(t not in ['tkhd','edts','mdia'] for t,p,n in parts):raise ValueError('track dependencies')
  hdr=next(p for t,p,n in parts if t=='tkhd');assert b[hdr+8]==0
  tid=int.from_bytes(b[hdr+20:hdr+24],'big');mdia=next((p,n) for t,p,n in parts if t=='mdia');m=boxes(b,mdia[0]+8,sum(mdia));hdlr=next(p for t,p,n in m if t=='hdlr');kind=b[hdlr+16:hdlr+20].decode()
  if kind not in ['vide','soun']:raise ValueError('unsupported track')
  tracks.append((tid,kind))
  if kind=='soun' and tid==track:edited[hdr-offset+11]|=1;enabled.append(hdr+11)
  if kind=='soun' and tid!=track:edited[p-offset+4:p-offset+8]=b'free';replacements.append(p+4)
 if tracks!=[(1,'vide'),(2,'soun'),(3,'soun')]:raise ValueError('fixture profile changed')
 return b[:offset]+edited+b[offset+size:],{'offset':offset,'size':size,'replacements':replacements,'enabledFlagOffsets':enabled,'tracks':tracks}

def packets(p):
 o=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(p)]))
 return {stream:[{k:p.get(k) for k in ['pts','dts','duration','data_hash']} for p in o['packets'] if p['stream_index']==stream] for stream in {p['stream_index'] for p in o['packets']}}
results=[]
for name in ['two-front','two-tail']:
 p=r/(name+'.mp4');b=p.read_bytes();out,info=select(b);dest=r/(name+'-selected.mp4');dest.write_bytes(out);original=packets(p);changed=packets(dest);assert original[0]==changed[0] and original[2]==changed[1]
 for t,off,n in boxes(b):
  if t=='mdat':assert b[off:off+n]==out[off:off+n]
 assert len(b)==len(out)
 info.update(name=name,originalSHA256=hashlib.sha256(b).hexdigest(),selectedSHA256=hashlib.sha256(out).hexdigest(),sameSelectedPackets=True,sameMdat=True,sameSize=True);results.append(info)
 bad=bytearray(b);trak=next(p for t,p,n in boxes(b,info['offset']+8,info['offset']+info['size']) if t=='trak');bad[trak+12:trak+16]=b'tref'
 try:select(bad);raise AssertionError('dependency accepted')
 except ValueError as e:assert str(e)=='track dependencies'
 bad=bytearray(b);bad[:4]=b'\0\0\0\x01'
 try:select(bad);raise AssertionError('size accepted')
 except ValueError:pass
(r/'identity.json').write_text(json.dumps({'scope':'Known unencrypted three-track fixture only; nested dependencies and non-32-bit box sizes reject. All unselected payload remains: not a redacted export.','cases':results,'negativeControls':2},indent=2)+'\n')
