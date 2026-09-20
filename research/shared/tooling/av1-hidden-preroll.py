# SPDX-License-Identifier: Apache-2.0
"""Constrained syntax author, not a display-bit flip: hidden/showable/error-resilient/refresh syntax and alignment."""
import pathlib,sys,json,struct,subprocess,hashlib
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);base=pathlib.Path(sys.argv[2]);data=(base/'dictionary.ivf').read_bytes();ps=[];at=32
while at<len(data):n,t=struct.unpack_from('<IQ',data,at);ps.append(data[at+12:at+12+n]);at+=12+n
trace=(base/'trace.log').read_text();assert 'timing_info_present_flag                                    0 = 0' in trace and 'enable_order_hint                                           0 = 0' in trace and 'frame_id_numbers_present_flag                               0 = 0' in trace

def leb(n):
 b=[]
 while n>=128:b.append((n&127)|128);n>>=7
 return bytes(b+[n])
def obus(p):
 at=0
 while at<len(p):
  head=p[at];assert head&2 and not head&4;at+=1;n=shift=0
  while True:
   b=p[at];at+=1;n|=(b&127)<<shift;shift+=7
   if not b&128:break
  yield head,p[at:at+n];at+=n

def patch(p,key,naive=False):
 result=[]
 for h,b in obus(p):
  if h>>3&15==6:
   bits=''.join(f'{x:08b}' for x in b);assert bits[0]=='0' and bits[1:3]==('00' if key else '01') and bits[3]=='1'
   if naive:bits=bits[:3]+'0'+bits[4:];b=int(bits,2).to_bytes(len(b),'big')
   else:
    meaningful=28 if key else 74;header=bits[:meaningful];header=header[:3]+'0'+('11'+header[4:8]+'11111111'+header[8:] if key else '1'+header[4:]);header+='0'*(-len(header)%8);oldbytes=4 if key else 10;b=int(header,2).to_bytes(len(header)//8,'big')+b[oldbytes:]
  result.append(bytes([h])+leb(len(b))+b)
 return b''.join(result)
def ivf(packets):
 h=bytearray(data[:32]);struct.pack_into('<I',h,24,len(packets));return bytes(h)+b''.join(struct.pack('<IQ',len(p),i)+p for i,p in enumerate(packets))
hidden=[patch(ps[0],True),patch(ps[1],False),ps[2]];variants={'baseline':ps,'hidden':hidden,'missing-reference':[hidden[0],hidden[2]],'naive-bitflip':[patch(ps[0],True,True),patch(ps[1],False,True),ps[2]]};rows={}
for name,packets in variants.items():
 p=out/(name+'.ivf');p.write_bytes(ivf(packets));r=subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(p),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=20);rows[name]={'exit':r.returncode,'bytes':len(r.stdout),'sha256':hashlib.sha256(r.stdout).hexdigest(),'stderr':r.stderr.decode()};(out/(name+'.yuv')).write_bytes(r.stdout)
ref=(out/'baseline.yuv').read_bytes()[46080:];correct=(out/'hidden.yuv').read_bytes();assert len(ref)==23040 and correct==ref
assert (out/'missing-reference.yuv').read_bytes()!=ref;assert (out/'naive-bitflip.yuv').read_bytes()!=ref
with (out/'hidden-trace.log').open('wb') as f:subprocess.run(['ffmpeg','-v','verbose','-i',str(out/'hidden.ivf'),'-c','copy','-bsf:v','trace_headers','-f','null','-'],stdout=f,stderr=f,check=True)
input={'baseline':[[*p] for p in ps],'candidate':[[*p] for p in hidden],'oracleSHA256':hashlib.sha256(ref).hexdigest(),'rows':rows,'passed':True,'plan':'Constrained no-frame-ID/no-timing/no-order-hint, lossless single-tile AV1. Hidden key explicitly authors showable/error-resilient/refresh-all fields; hidden inter authors showable field; both repad frame header and retain entropy tile bytes. Freshseek targetpicture2 exact, missingrequiredreference and naivebitflip falsifiers. Fifty fresh owners per job,7 alternating pairs; include headerauthor cost, compare baseline closing unused frames immediately; require5percent median complete job saving.'};(out/'input.json').write_text(json.dumps(input,indent=2)+'\n');print(json.dumps(rows))
