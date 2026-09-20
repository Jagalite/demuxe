# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,struct,json,re,subprocess,hashlib
out=pathlib.Path(sys.argv[1])
def packets(name):
 b=(out/name).read_bytes();at=32;ps=[]
 while at<len(b):n,t=struct.unpack_from('<IQ',b,at);ps.append(b[at+12:at+12+n]);at+=12+n
 return b[:32],ps
header,a=packets('a.ivf');_,b=packets('b.ivf')
def fields(trace):
 result=[]
 for chunk in trace.split('Frame Header\n')[1:]:
  chunk=chunk.split('Tile Group')[0];fs=[]
  for line in chunk.splitlines():
   m=re.search(r'\]\s+(\d+)\s+(\S+)\s+([01]+)\s+=\s+(-?\d+)',line)
   if m:fs.append((int(m[1]),m[2],m[3],int(m[4])))
  result.append(fs)
 return result
f=fields((out/'b-trace.log').read_text());assert len(f)==3

def leb(n):
 out=[]
 while n>=128:out.append(n&127|128);n>>=7
 return bytes(out+[n])
def relocate(packet,fs,key=False):
 at=0;parts=[];start=next(x[0] for x in fs if x[1]=='show_existing_frame');pad=next(x[0] for x in fs if x[1]=='zero_bit');meaningful=pad-start;oldbytes=(pad+7)//8-start//8
 while at<len(packet):
  h=packet[at];at+=1;assert h&2 and not h&4;n=shift=0
  while True:
   x=packet[at];at+=1;n|=(x&127)<<shift;shift+=7
   if not x&128:break
  body=packet[at:at+n];at+=n;typ=h>>3&15
  if typ==1:continue # Same source profile, preserve active sequence header.
  if typ==6:
   bits=''.join(f'{x:08b}' for x in body[:oldbytes])[:meaningful]
   if key:
    assert bits[:4]=='0001';bits='0100'+'11'+bits[4:8]+'00010000'+bits[8:]
   else:
    bits=list(bits)
    for pos,name,value,num in fs:
     if name=='refresh_frame_flags':new=num<<4;bits[pos-start:pos-start+8]=f'{new:08b}'
     elif name.startswith('ref_frame_idx['):bits[pos-start:pos-start+3]=f'{num+4:03b}'
    bits=''.join(bits)
   bits+='0'*(-len(bits)%8);body=int(bits,2).to_bytes(len(bits)//8,'big')+body[oldbytes:]
  parts.append(bytes([h])+leb(len(body))+body)
 return b''.join(parts)
bank=[relocate(p,fs,i==0) for i,(p,fs) in enumerate(zip(b,f))]
show=lambda slot:b'\x12\0\x1a\1'+bytes([0x88|slot<<4])
combined=a+[bank[0],show(4),bank[1],bank[2]]+[show(i) for i in [1,5,2,6]*12]
expected=[('a',0),('a',1),('a',2),('b',0),('b',1),('b',2)]+[('a',1),('b',1),('a',2),('b',2)]*12

def ivf(ps):
 h=bytearray(header);struct.pack_into('<I',h,24,len(ps));return bytes(h)+b''.join(struct.pack('<IQ',len(p),i)+p for i,p in enumerate(ps))
(out/'combined.ivf').write_bytes(ivf(combined));raw={}
for n in ['a','b','combined']:
 p=subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(out/(n+'.ivf')),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=20);raw[n]=p.stdout;(out/(n+'-decode.log')).write_bytes(p.stderr);(out/(n+'.yuv')).write_bytes(p.stdout)
oracle=b''.join(raw[n][i*23040:(i+1)*23040] for n,i in expected);assert raw['combined']==oracle,(len(raw['combined']),len(oracle))
# Unrelocated B key destroys A references and therefore the post-switch A recall output.
(out/'wrong-reset.ivf').write_bytes(ivf(a+b+[show(i) for i in [1,5,2,6]*12]));wrong=subprocess.run(['ffmpeg','-v','error','-i',str(out/'wrong-reset.ivf'),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=20);assert wrong.stdout!=oracle
(out/'input.json').write_text(json.dumps({'a':[list(p) for p in a],'b':[list(p) for p in b],'combined':[list(p) for p in combined],'expected':expected,'hashes':{n:[hashlib.sha256(raw[n][i*23040:(i+1)*23040]).hexdigest() for i in range(3)] for n in ['a','b']},'wrongResetDetected':True,'passed':True,'profile':'Two same-profile independently encoded AV1 videos, lossless/no-order-hint/no-frameID/no-grain/single-tile; B key becomes hidden intra-only with refresh slot4, B dependent references/refresh masks relocate to4/5/6, no sequence reset. All entropy tile bytes retained. No arbitrary videos or shared cross-source authority inferred.'},indent=2)+'\n');print('exact',len(expected),'pictures')
