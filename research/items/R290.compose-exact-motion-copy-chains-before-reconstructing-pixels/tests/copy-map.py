# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys,re,hashlib,time,statistics,array
p=pathlib.Path(sys.argv[1]);p.mkdir(exist_ok=True)
W=64;H=64;SZ=W*H*3//2
MV=['1','01','001','0001','000011','0000101','0000100','0000011','000001011','000001010','000001001','0000010001','0000010000','0000001111','0000001110','0000001101','0000001100']
def pack(bits):return int(bits.ljust((len(bits)+7)//8*8,'0'),2).to_bytes((len(bits)+7)//8,'big')
def ui(n,b):return format(n,'0%db'%b)
def mv(v):return MV[abs(v)]+('1' if v<0 else '0') if v else '1'
def picture(i,half=False):
 b=b'\0\0\1\0'+pack(ui(i,10)+'010'+'1'*16+'0'+'111'+'0')
 # picturecodingextension: fcode1/1, backward unused15/15, precision0, framepicture3, progressive
 b+=b'\0\0\1\xb5'+pack('1000'+'0001'*2+'1111'*2+'00'+'11'+'0'+'1'+'0'*5+'11'+'0')
 for y in range(4):
  bits='00010'+'0';last=0
  for x in range(4):
   v=(1 if half else 4) if x<3 else 0
   bits+='1'+'001'+mv(v-last)+'1';last=v
  b+=b'\0\0\1'+bytes([y+1])+pack(bits)
 return b
class Bits:
 def __init__(self,b):self.s=''.join(ui(x,8) for x in b);self.i=0
 def take(self,n):s=self.s[self.i:self.i+n];assert len(s)==n;self.i+=n;return s
 def n(self,n):return int(self.take(n),2)
 def motion(self):
  c=''
  for _ in range(10):
   c+=self.take(1)
   if c in MV:
    n=MV.index(c);return -n if n and self.take(1)=='1' else n
  raise ValueError('motion VLC')
def units(data):
 marks=list(re.finditer(b'\0\0\1',data));return [(data[m.end()],data[m.end()+1:marks[j+1].start() if j+1<len(marks) else len(data)]) for j,m in enumerate(marks)]
def parse(data):
 out=[];row=None
 for code,b in units(data):
  if code==0:
   q=Bits(b);t=q.n(10);kind=q.n(3)
   if kind==1:row=None;continue
   assert kind==2 and q.n(16)==65535 and q.take(4)=='0111' and q.n(1)==0
   row={'temporal':t,'vectors':[]};out.append(row)
  elif code==181 and row is not None:
   q=Bits(b);assert q.take(4)=='1000';assert q.take(16)=='0001000111111111';assert q.take(14)=='00110100000110'
  elif 1<=code<=4 and row is not None:
   q=Bits(b);assert q.n(5)==2 and q.n(1)==0;last=0
   for x in range(4):
    assert q.take(1)=='1' and q.take(3)=='001';last+=q.motion();vy=q.motion();assert -16<=last<16
    row['vectors'].append([x,code-1,last,vy])
   assert set(q.s[q.i:])<=set('0')
 for r in out:assert len(r['vectors'])==16
 return out
def decode(data):
 r=subprocess.run(['ffmpeg','-v','error','-f','mpegvideo','-i','pipe:0','-f','rawvideo','-pix_fmt','yuv420p','pipe:1'],input=data,capture_output=True);assert r.returncode==0,r.stderr;assert len(r.stdout)%SZ==0;return r.stdout

def execute(data,wrong=False):
 marks=list(re.finditer(b'\0\0\1\0',data));anchor=decode(data[:marks[1].start()])[-SZ:];maps=list(range(SZ));trace=parse(data);fallback=[]
 for i,r in enumerate(trace):
  if any(vx%4 or vy%4 for _,_,vx,vy in r['vectors']) and not wrong:
   # Unsupported interpolation conservatively materializes full prefix, not relabeled symbolic success.
   end=marks[i+2].start() if i+2<len(marks) else len(data);anchor=decode(data[:end])[-SZ:];maps=list(range(SZ));fallback.append(r['temporal']);continue
  new=[0]*SZ;offset=0
  for plane in range(3):
   w=W if plane==0 else W//2;h=H if plane==0 else H//2;bs=16 if plane==0 else 8;scale=2 if plane==0 else 4
   for x,y,vx,vy in r['vectors']:
    dx=vx//scale;dy=vy//scale
    for yy in range(y*bs,(y+1)*bs):
     for xx in range(x*bs,(x+1)*bs):
      sx=xx+dx;sy=yy+dy
      assert 0<=sx<w and 0<=sy<h,'unsupported edge outside frame'
      new[offset+yy*w+xx]=maps[offset+sy*w+sx]
   offset+=w*h
  maps=new
 return bytes(anchor[j] for j in maps),trace,fallback
if not (p/'anchor.m2v').exists():
 subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=64x64:r=25','-frames:v','1','-c:v','mpeg2video','-bf','0','-g','40','-q:v','2','-pix_fmt','yuv420p','-f','mpeg2video',str(p/'anchor.m2v')],check=True)
anchor=(p/'anchor.m2v').read_bytes().removesuffix(b'\0\0\1\xb7');results={}
for mode in ['integer','fractional']:
 data=anchor+b''.join(picture(i,mode=='fractional' and i==8) for i in range(1,33));(p/(mode+'.m2v')).write_bytes(data)
 ref=decode(data);got,trace,fallback=execute(data);assert len(ref)==33*SZ;assert got==ref[-SZ:]
 (p/(mode+'-candidate.yuv')).write_bytes(got);(p/(mode+'-reference.yuv')).write_bytes(ref);(p/(mode+'-trace.json')).write_text(json.dumps(trace,indent=2))
 wrong=execute(data,True)[0] if mode=='fractional' else None
 if wrong is not None:assert wrong!=ref[-SZ:]
 results[mode]={'pictures':33,'parsedPredictionMBs':512,'finalPlanesExact':True,'fallbackPictures':fallback,'wrongFractionalShortcutDiffers':wrong!=ref[-SZ:] if wrong else None,'sha256':hashlib.sha256(got).hexdigest()}
(p/'results.json').write_text(json.dumps(results,indent=2));print(results)
