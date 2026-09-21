"""D32: finite G.711 AU → WAVE adapter; sample bytes are never decoded."""
from common import *
import numpy as np

def au_to_wav(src:bytes):
 if len(src)<24:raise ValueError('short AU')
 magic,off,size,encoding,rate,channels=struct.unpack_from('>6I',src)
 if magic!=0x2e736e64 or off<24 or off>len(src):raise ValueError('AU structure')
 if encoding not in [1,27]:raise ValueError('G.711 only')
 if channels not in [1,2] or not 8000<=rate<=48000:raise ValueError('rate/layout scope')
 if size==0xffffffff or size!=len(src)-off or size%channels:raise ValueError('finite complete aligned payload required')
 if size>16*1024*1024:raise ValueError('screen byte cap')
 payload=src[off:]
 def ck(t,b):return t+struct.pack('<I',len(b))+b+(b'\0' if len(b)&1 else b'')
 fmt=struct.pack('<HHIIHHH',7 if encoding==1 else 6,channels,rate,rate*channels,channels,8,0)
 body=b'WAVE'+ck(b'fmt ',fmt)+ck(b'fact',struct.pack('<I',size//channels))+ck(b'data',payload)
 return b'RIFF'+struct.pack('<I',len(body))+body

def g711(v,alaw):
 if alaw:
  v^=0x55;x=(v&15)<<4;seg=(v&0x70)>>4
  if seg==0:x+=8
  elif seg==1:x+=0x108
  else:x=(x+0x108)<<(seg-1)
  return x if v&128 else -x
 v=(~v)&255;x=((v&15)<<3)+0x84;x<<=(v&0x70)>>4
 return (0x84-x) if v&128 else x-0x84

if __name__=='__main__':
 info={}
 for name,enc in [('pcm_mulaw',1),('pcm_alaw',27)]:
  # Existing probe created actual signal AU; transformation itself performs no encoding.
  src=(F/(name+'.au')).read_bytes();out=au_to_wav(src);(F/(name+'_wrapped.wav')).write_bytes(out)
  raw=ff('-i',F/(name+'.au'),'-f','s16le','-');candidate=ff('-i',F/(name+'_wrapped.wav'),'-f','s16le','-')
  ff('-i',F/(name+'.au'),'-c:a','pcm_s16le',F/(name+'_reference.wav'))
  off=int.from_bytes(src[4:8],'big');payload=src[off:]
  manual=np.array([g711(x,enc==27) for x in payload],dtype='<i2').tobytes()
  info[name]={'source_bytes':len(src),'wrapped_bytes':len(out),'payload_bytes':len(payload),'payload_exact':out[out.index(b'data')+8:out.index(b'data')+8+len(payload)]==payload,'host_pcm_exact':raw==candidate,'manual_oracle_exact':raw==manual,'samples':len(raw)//2}
  # All 256 companded symbols, repeated incl nonintegral-tail count. Two equivalent wrappers plus PCM oracle.
  data=bytes(range(256))*3+bytes([0,128,255]);au=struct.pack('>6I',0x2e736e64,24,len(data),enc,8000,1)+data
  n=name+'_allcodes';(F/(n+'.au')).write_bytes(au);(F/(n+'.wav')).write_bytes(au_to_wav(au))
  pcm=np.array([g711(x,enc==27) for x in data],dtype='<i2');(F/(n+'.s16')).write_bytes(pcm.tobytes())
  ff('-f','s16le','-ar','8000','-ac','1','-i',F/(n+'.s16'),F/(n+'_reference.wav'))
  info[name]['allcodes_host_exact']=ff('-i',F/(n+'.wav'),'-f','s16le','-')==pcm.tobytes()
  bad=bytearray(src);bad[8:12]=b'\xff'*4
  info[name]['unknown_length']=reject(lambda:au_to_wav(bad));info[name]['truncation']=reject(lambda:au_to_wav(src[:-1]))
  badcodec=bytearray(src);badcodec[12:16]=(3).to_bytes(4,'big');info[name]['unsupported']=reject(lambda:au_to_wav(badcodec))
  wrong=bytearray(src);wrong[12:16]=(27 if enc==1 else 1).to_bytes(4,'big');(F/(name+'_wrong_law.wav')).write_bytes(au_to_wav(wrong))
 save('au_component.json',info);print(json.dumps(info,indent=2))
