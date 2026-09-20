# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,struct,subprocess,re,hashlib
out=pathlib.Path(sys.argv[1]);base=pathlib.Path('research/shared/runs/20260919T231631Z-av1-reference-banks');inp=json.loads((base/'input.json').read_text());a=[bytes(p) for p in inp['a']];b=[bytes(p) for p in inp['b']]
def leb(n):
 z=[]
 while n>=128:z.append(n&127|128);n>>=7
 return bytes(z+[n])
def patch(packet,trace,ix,kind,wrong=False):
 fs=[(int(pos),name,len(bits)) for pos,name,bits in re.findall(r'\]\s+(\d+)\s+(\S+)\s+([01]+)\s+=',trace.split('Frame Header\n')[ix+1].split('Tile Group')[0])];start=next(pos for pos,name,n in fs if name=='show_existing_frame');end=next(pos for pos,name,n in fs if name=='zero_bit');oldbytes=(end+7)//8-start//8;meaningful=end-start;at=0;parts=[]
 while at<len(packet):
  h=packet[at];at+=1;n=shift=0
  while True:
   x=packet[at];at+=1;n|=(x&127)<<shift;shift+=7
   if not x&128:break
  body=packet[at:at+n];at+=n;typ=h>>3&15
  if typ==1 and kind=='insert':continue
  if typ==6:
   bits=''.join(f'{x:08b}' for x in body[:oldbytes])[:meaningful]
   if kind=='hide':assert bits[:4]=='0011';bits=bits[:3]+'01'+bits[4:]
   else:assert bits[:4]=='0001';bits='0101'+'1'+bits[4:8]+('00000010' if wrong else '00000000')+bits[8:]
   bits+='0'*(-len(bits)%8);body=int(bits,2).to_bytes(len(bits)//8,'big')+body[oldbytes:]
  parts.append(bytes([h])+leb(len(body))+body)
 return b''.join(parts)
hidden=patch(a[1],(base/'a-trace.log').read_text(),1,'hide');insert=patch(b[0],(base/'b-trace.log').read_text(),0,'insert');bad=patch(b[0],(base/'b-trace.log').read_text(),0,'insert',True)
variants={'candidate':[a[0],hidden,insert,a[2]],'wrong-refresh':[a[0],hidden,bad,a[2]]};oracle=(base/'a.yuv').read_bytes()[:23040]+(base/'b.yuv').read_bytes()[:23040]+(base/'a.yuv').read_bytes()[46080:];rows={}
for name,ps in variants.items():
 h=bytearray((base/'a.ivf').read_bytes()[:32]);struct.pack_into('<I',h,24,len(ps));(out/(name+'.ivf')).write_bytes(bytes(h)+b''.join(struct.pack('<IQ',len(p),i)+p for i,p in enumerate(ps)));r=subprocess.run(['ffmpeg','-v','error','-i',str(out/(name+'.ivf')),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=15);(out/(name+'.yuv')).write_bytes(r.stdout);(out/(name+'.log')).write_bytes(r.stderr);rows[name]={'exact':r.stdout==oracle,'bytes':len(r.stdout)}
assert rows['candidate']['exact'] and not rows['wrong-refresh']['exact'];(out/'input.json').write_text(json.dumps({'packets':{k:[list(p) for p in v] for k,v in variants.items()},'hashes':[hashlib.sha256(oracle[i*23040:(i+1)*23040]).hexdigest() for i in range(3)],'rows':rows,'passed':True},indent=2)+'\n');print(rows)
