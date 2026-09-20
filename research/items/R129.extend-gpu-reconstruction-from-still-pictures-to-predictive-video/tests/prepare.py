# SPDX-License-Identifier: Apache-2.0
import ast,pathlib,sys,json,subprocess,re,hashlib
p=pathlib.Path(sys.argv[1]);source=pathlib.Path('research/items/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels');tree=ast.parse((source/'tests/copy-map-alternating.py').read_text());nodes=[]
for n in tree.body:
 if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef,ast.ClassDef)):nodes.append(n)
 elif isinstance(n,ast.Assign) and not any(isinstance(z,ast.Call) for z in ast.walk(n)):nodes.append(n)
g={};exec(compile(ast.Module(nodes,type_ignores=[]),'<MPEG2Psyntax>','exec'),g);pack=g['pack'];ui=g['ui']
L=['100','00','01','101','110','1110','11110','111110','1111110','11111110','111111110','111111111'];C=['00','01','10','110','1110','11110','111110','1111110','11111110','111111110','1111111110','1111111111']
def dc(delta,table):
 size=abs(delta).bit_length();return table[size]+(ui(delta if delta>=0 else (1<<size)-1+delta,size) if size else '')
anchor=(source/'evidence/20260919T232100Z-alternating-copy-map/anchor.m2v').read_bytes();prefix=anchor[:anchor.index(b'\0\0\1\0')]
b=prefix+b'\0\0\1\0'+pack('0'*10+'001'+'1'*16+'0')+b'\0\0\1\xb5'+pack('1000'+'1'*16+'00'+'11'+'0'+'1'+'0'*5+'11'+'0')
for my in range(4):
 bits='00010'+'0';pred=[128]*3
 for mx in range(4):
  bits+='11'
  for k in range(6):
   plane=0 if k<4 else k-3
   val=(30+(mx*2+k%2)*15+(my*2+k//2)*7) if plane==0 else (70+mx*13+my*9+plane*30)
   assert val<256;bits+=dc(val-pred[plane],L if plane==0 else C)+'10';pred[plane]=val
 b+=b'\0\0\1'+bytes([my+1])+pack(bits)
stream=b+b''.join(g['picture'](i) for i in range(1,33));(p/'dc-ip.m2v').write_bytes(stream)
# Separate entropy observer reads the actual generated I picture, never generator side-channel coefficient values.
coeff=[None]*96
for code,payload in g['units'](b):
 if not 1<=code<=4:continue
 q=g['Bits'](payload);assert q.n(5)==2 and q.n(1)==0;pred=[128]*3
 for mx in range(4):
  assert q.take(2)=='11'
  for k in range(6):
   plane=0 if k<4 else k-3;table=L if plane==0 else C;word=''
   while word not in table:word+=q.take(1)
   size=table.index(word);delta=q.n(size) if size else 0
   if size and delta<(1<<(size-1)):delta-=((1<<size)-1)
   pred[plane]+=delta;assert q.take(2)=='10','nonDC coefficient not admitted'
   idx=((code-1)*2+k//2)*8+mx*2+k%2 if plane==0 else 64+(plane-1)*16+(code-1)*4+mx
   coeff[idx]=pred[plane]*8
 assert set(q.s[q.i:])<=set('0')
assert None not in coeff;trace=g['parse'](stream);assert len(trace)==32 and all(vx%4==0 and vy%4==0 for r in trace for _,_,vx,vy in r['vectors'])
raw=g['decode'](stream);assert len(raw)==33*6144;(p/'reference.yuv').write_bytes(raw)
# DC-only mismatchcontrol adds +/-1 atfrequency63; spatial contribution hasmagnitude<.25 androunds tozero when DCmultiple8. Thus integerDC inverse is exact for admitted coefficientprofile.
expected=[]
for plane in range(3):
 w=64 if plane==0 else 32;off=0 if plane==0 else 64+(plane-1)*16
 for y in range(w):
  for x in range(w):expected.append(coeff[off+(y//8)*(w//8)+x//8]//8)
assert bytes(expected)==raw[:6144]
(p/'syntax.json').write_text(json.dumps({'sourceSHA':hashlib.sha256(stream).hexdigest(),'coefficients':coeff,'pictures':trace,'coefficientProfile':'8bitprogressive420 intraDCprecision0, allACzero, DCmultiples8, mismatch63 absolute spatialcontribution<.25 so exactinteger rounding; allPmotiononly/chromaaligned.','independentOracle':'FFmpeg8.1.2 full33picture decodedplanes','initialPictureExact':True},indent=2));print('33 actual MPEG2 pictures,96 parsedDC blocks,512 parsedP macroblocks')
