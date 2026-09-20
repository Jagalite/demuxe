# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,struct,re,hashlib,subprocess
out=pathlib.Path(sys.argv[1]);trace=(out/'trace.log').read_text();data=(out/'grain.ivf').read_bytes();packets=[];at=32
while at<len(data):n,t=struct.unpack_from('<IQ',data,at);packets.append(data[at+12:at+12+n]);at+=12+n
chunks=trace.split('Frame Header\n')[1:];assert len(chunks)==len(packets)==3;sidecar=[]
for chunk in chunks:
 chunk=chunk.split('Tile Group')[0];fields=[]
 for line in chunk.splitlines():
  m=re.search(r'\]\s+(\d+)\s+(\S+)\s+([01]+)\s+=\s+(-?\d+)',line)
  if m:fields.append({'bit':int(m[1]),'name':m[2],'bits':m[3],'value':int(m[4])})
 start=next(x['bit'] for x in fields if x['name']=='show_existing_frame');apply=next(x for x in fields if x['name']=='apply_grain');assert apply['value']==1;end=next(x['bit'] for x in fields if x['name']=='zero_bit');grain=[x for x in fields if apply['bit']<=x['bit']<end];assert all(x['value']==1 for x in grain if x['name']=='update_grain');sidecar.append({'frameHeaderStart':start,'applyBit':apply['bit']-start,'oldHeaderBytes':(end+7)//8-start//8,'resolvedParameters':grain})
def leb(n):
 a=[]
 while n>=128:a.append(n&127|128);n>>=7
 return bytes(a+[n])
def transform(p,fields):
 at=0;out=[]
 while at<len(p):
  head=p[at];at+=1;assert head&2 and not head&4;n=shift=0
  while True:
   b=p[at];at+=1;n|=(b&127)<<shift;shift+=7
   if not b&128:break
  body=p[at:at+n];at+=n
  if head>>3&15==6:
   old=fields['oldHeaderBytes'];bits=''.join(f'{x:08b}' for x in body[:old]);assert bits[fields['applyBit']]=='1';h=bits[:fields['applyBit']]+'0';h+='0'*(-len(h)%8);tile=body[old:];body=int(h,2).to_bytes(len(h)//8,'big')+tile;fields['entropySHA256']=hashlib.sha256(tile).hexdigest()
  out.append(bytes([head])+leb(len(body))+body)
 return b''.join(out)
candidate=[transform(p,f) for p,f in zip(packets,sidecar)];(out/'base.ivf').write_bytes(data[:32]+b''.join(struct.pack('<IQ',len(p),i)+p for i,p in enumerate(candidate)))
def dec(p,grain=None):return subprocess.check_output(['ffmpeg','-v','error','-nostdin',*(['-filmgrain',str(grain)] if grain is not None else []),'-i',str(p),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],timeout=20)
base=dec(out/'grain.ivf',0);full=dec(out/'grain.ivf',1);actual=dec(out/'base.ivf');assert len(base)==3*23040 and actual==base and base!=full
(out/'independent-base.yuv').write_bytes(base);(out/'independent-grain.yuv').write_bytes(full);side={'sourceSHA256':hashlib.sha256(data).hexdigest(),'frames':sidecar,'profile':'3frames,8bit420,allupdate_grain=1,explicitgrainomission. Trace-derived bounded header coordinates require exactsourceSHA. No sidecar inheritance or separate grain synthesis claim.'};(out/'sidecar.json').write_text(json.dumps(side,indent=2)+'\n');(out/'input.json').write_text(json.dumps({'baseline':[list(p) for p in packets],'candidate':[list(p) for p in candidate],'hashes':[hashlib.sha256(base[i*23040:(i+1)*23040]).hexdigest() for i in range(3)],'grainHashes':[hashlib.sha256(full[i*23040:(i+1)*23040]).hexdigest() for i in range(3)],'sidecar':side,'passed':True},indent=2)+'\n');print(json.dumps({'baseExact':True,'grainChangesOutput':True,'originalBytes':len(data),'candidateBytes':(out/'base.ivf').stat().st_size}))
