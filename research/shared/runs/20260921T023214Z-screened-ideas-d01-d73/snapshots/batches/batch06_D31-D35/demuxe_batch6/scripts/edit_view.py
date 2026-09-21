"""D33: finite MP4 single and multi-edit audio views, without moving media bytes."""
from common import *
import numpy as np

def boxes(b,start=0,end=None):
 end=len(b) if end is None else end
 while start<end:
  if end-start<8:raise ValueError('short box')
  n,t=struct.unpack_from('>I4s',b,start)
  if n<8 or start+n>end:raise ValueError('box length scope')
  yield start,n,t
  start+=n

def path(b,types):
 arr=[(0,len(b),None)]
 for typ in types:
  arr=[x for p,n,k in arr for x in boxes(b,p+(0 if k is None else 8),p+n) if x[2]==typ]
 return arr

def view(b,edits):
 # Movie/track timebases both 48000 in the authored single-audio-track source.
 if len(path(b,[b'moov',b'trak']))!=1:raise ValueError('one track only')
 mv=path(b,[b'moov',b'mvhd'])[0][0];tk=path(b,[b'moov',b'trak',b'tkhd'])[0][0];md=path(b,[b'moov',b'trak',b'mdia',b'mdhd'])[0][0]
 if any(b[s+8]!=0 for s in [mv,tk,md]):raise ValueError('version0 only')
 if struct.unpack_from('>I',b,mv+20)[0]!=48000 or struct.unpack_from('>I',b,md+20)[0]!=48000:raise ValueError('exact clock required')
 ep,en,_=path(b,[b'moov',b'trak',b'edts',b'elst'])[0]
 if b[ep+8]!=0 or struct.unpack_from('>I',b,ep+12)[0]!=1:raise ValueError('source single edit')
 duration,origin,ratei,ratef=struct.unpack_from('>Iihh',b,ep+16)
 if ratei!=1 or ratef!=0:raise ValueError('unit playback rate')
 for a,z in edits:
  if not 0<=a<z<=duration:raise ValueError('edit outside source presentation')
 total=sum(z-a for a,z in edits)
 data=b'\0'*4+struct.pack('>I',len(edits))+b''.join(struct.pack('>Iihh',z-a,origin+a,1,0) for a,z in edits)
 replacement=struct.pack('>I4s',8+len(data),b'elst')+data;delta=len(replacement)-en
 # Source has tail moov, so all original mdat positions remain untouched.
 moov=path(b,[b'moov'])[0];mdats=[(p,n) for p,n,t in boxes(b) if t==b'mdat']
 if not mdats or any(p+n>moov[0] for p,n in mdats):raise ValueError('tail moov only')
 out=bytearray(b)
 out[mv+24:mv+28]=total.to_bytes(4,'big');out[tk+28:tk+32]=total.to_bytes(4,'big')
 for p,n,t in [moov,*path(b,[b'moov',b'trak']),*path(b,[b'moov',b'trak',b'edts'])]:out[p:p+4]=(n+delta).to_bytes(4,'big')
 out[ep:ep+en]=replacement
 return bytes(out),{'source_presentation_ticks':duration,'original_media_origin':origin,'new_presentation_ticks':total,'windows':edits,'delta_bytes':delta,'mdat_exact':all(b[p:p+n]==out[p:p+n] for p,n in mdats)}

if __name__=='__main__':
 o={}
 for codec in ['aac','flac']:
  name=codec+'_edit_source.mp4'
  ff('-f','lavfi','-i','aevalsrc=0.18*sin(2*PI*(311+109*t)*t)+0.05*sin(2*PI*1991*t):s=48000:d=2.137','-c:a',codec,'-strict','-2','-movie_timescale','48000',F/name)
  src=(F/name).read_bytes();base=ff('-i',F/name,'-f','f32le','-');(F/(codec+'_source.f32')).write_bytes(base)
  o[codec]={}
  for variant,edits in [('single',[(12345,67890)]),('double',[(12345,40001),(71234,90000)])]:
   try:
    out,meta=view(src,edits);n=codec+'_'+variant+'.mp4';(F/n).write_bytes(out)
    decoded=ff('-i',F/n,'-f','f32le','-');(F/(codec+'_'+variant+'.f32')).write_bytes(decoded)
    exp=b''.join(base[a*4:z*4] for a,z in edits)
    meta.update(host_frames=len(decoded)//4,expected_frames=len(exp)//4,host_exact=decoded==exp,bytes=len(out),source_bytes=len(src));o[codec][variant]=meta
   except Exception as ex:o[codec][variant]={'error':str(ex)}
  o[codec]['bounds_negative']=reject(lambda:view(src,[(0,99999999)]))
 save('edit_component.json',o);print(json.dumps(o,indent=2))
