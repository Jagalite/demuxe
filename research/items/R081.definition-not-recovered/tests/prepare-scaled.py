# SPDX-License-Identifier: Apache-2.0
"""Actual dimension-parameterized DC-I/chroma-aligned-P MPEG2, parsed independently."""
import pathlib,sys,subprocess,json,hashlib,ast,time
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);W=int(sys.argv[2]);H=W;assert W in [64,256,512];start=time.perf_counter()
source=pathlib.Path('research/items/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels/tests/copy-map-alternating.py');tree=ast.parse(source.read_text());nodes=[]
for n in tree.body:
 if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef,ast.ClassDef)):nodes.append(n)
 elif isinstance(n,ast.Assign) and not any(isinstance(z,ast.Call)for z in ast.walk(n)):nodes.append(n)
g={};exec(compile(ast.Module(nodes,type_ignores=[]),'<restricted MPEG2 primitives>','exec'),g);pack=g['pack'];ui=g['ui'];mv=g['mv'];Bits=g['Bits'];units=g['units'];M=W//16;SZ=W*H*3//2
L=['100','00','01','101','110','1110','11110','111110','1111110','11111110','111111110','111111111'];C=['00','01','10','110','1110','11110','111110','1111110','11111110','111111110','1111111110','1111111111']
def dc(delta,table):
 size=abs(delta).bit_length();return table[size]+(ui(delta if delta>=0 else (1<<size)-1+delta,size)if size else'')
cmd=['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-f','lavfi','-i',f'color=size={W}x{H}:rate=25','-frames:v','1','-c:v','mpeg2video','-bf','0','-g','40','-q:v','2','-pix_fmt','yuv420p','-f','mpeg2video',str(p/'header-source.m2v')];subprocess.run(cmd,check=True)
anchor=(p/'header-source.m2v').read_bytes();prefix=anchor[:anchor.index(b'\0\0\1\0')];b=prefix+b'\0\0\1\0'+pack('0'*10+'001'+'1'*16+'0')+b'\0\0\1\xb5'+pack('1000'+'1'*16+'00'+'11'+'0'+'1'+'0'*5+'11'+'0')
for my in range(M):
 bits='00010'+'0';pred=[128]*3
 for mx in range(M):
  bits+='11'
  for k in range(6):
   plane=0 if k<4 else k-3;val=32+((mx*29+my*17+k*11+plane*31)%192);bits+=dc(val-pred[plane],L if plane==0 else C)+'10';pred[plane]=val
 b+=b'\0\0\1'+bytes([my+1])+pack(bits)
def picture(i):
 data=b'\0\0\1\0'+pack(ui(i,10)+'010'+'1'*16+'0'+'111'+'0')+b'\0\0\1\xb5'+pack('1000'+'0001'*2+'1111'*2+'00'+'11'+'0'+'1'+'0'*5+'11'+'0')
 for y in range(M):
  bits='00010'+'0';last=0
  for x in range(M):
   v=(4 if i%2 else-4)if 0<x<M-1 else 0;bits+='1'+'001'+mv(v-last)+'1';last=v
  data+=b'\0\0\1'+bytes([y+1])+pack(bits)
 return data
stream=b+b''.join(picture(i)for i in range(1,33));(p/'dc-ip.m2v').write_bytes(stream)
# Independent entropy observer sees emitted bitstream, not generator coefficients.
coeff=[None]*((W//8)**2*3//2);trace=[];kind=None
for code,payload in units(stream):
 q=Bits(payload)
 if code==0:
  temporal=q.n(10);kind=q.n(3)
  if kind==2:trace.append({'temporal':temporal,'vectors':[]})
 elif 1<=code<=M:
  assert q.n(5)==2 and q.n(1)==0
  if kind==1:
   pred=[128]*3
   for mx in range(M):
    assert q.take(2)=='11'
    for k in range(6):
     plane=0 if k<4 else k-3;table=L if plane==0 else C;word=''
     while word not in table:word+=q.take(1)
     size=table.index(word);delta=q.n(size)if size else 0
     if size and delta<(1<<(size-1)):delta-=((1<<size)-1)
     pred[plane]+=delta;assert q.take(2)=='10';idx=((code-1)*2+k//2)*(W//8)+mx*2+k%2 if plane==0 else (W//8)**2+(plane-1)*M*M+(code-1)*M+mx;coeff[idx]=pred[plane]*8
  else:
   assert kind==2;last=0
   for mx in range(M):
    assert q.take(1)=='1'and q.take(3)=='001';last+=q.motion();vy=q.motion();assert last%4==vy%4==0;trace[-1]['vectors'].append([mx,code-1,last,vy])
  assert set(q.s[q.i:])<=set('0')
assert None not in coeff and len(trace)==32 and all(len(t['vectors'])==M*M for t in trace)
dec=['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-y','-hwaccel','none','-f','mpegvideo','-i',str(p/'dc-ip.m2v'),'-f','rawvideo','-pix_fmt','yuv420p',str(p/'reference.yuv')];subprocess.run(dec,check=True);raw=(p/'reference.yuv').read_bytes();assert len(raw)==33*SZ
expected=[]
for plane in range(3):
 w=W if plane==0 else W//2;off=0 if plane==0 else(W//8)**2+(plane-1)*M*M
 for y in range(w):
  for x in range(w):expected.append(coeff[off+(y//8)*(w//8)+x//8]//8)
assert bytes(expected)==raw[:SZ]
(p/'syntax.json').write_text(json.dumps({'width':W,'height':H,'sourceSHA':hashlib.sha256(stream).hexdigest(),'coefficients':coeff,'pictures':trace,'profile':'8bit420 progressive, DC precision0, ACzero with mismatch63 spatial contribution<.25; Pmotiononly,chroma-aligned','independentOracle':'Host FFmpeg software full-picture decode','initialPictureExact':True},separators=(',',':')))
(p/'preparation.json').write_text(json.dumps({'commands':[cmd,dec],'elapsedMs':(time.perf_counter()-start)*1000,'width':W,'frames':33,'sourceBytes':len(stream),'parsedDCBlocks':len(coeff),'parsedPredictionMacroblocks':M*M*32,'oracleBytes':len(raw),'sourceSHA256':hashlib.sha256(stream).hexdigest(),'oracleSHA256':hashlib.sha256(raw).hexdigest()},indent=2));print(W,len(stream),len(raw))
