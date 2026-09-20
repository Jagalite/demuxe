# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,subprocess,hashlib,struct
r=Path(sys.argv[1]);commands=[]
def call(a):commands.append(a);return subprocess.check_output(a,stderr=subprocess.PIPE)
def parse(d):
 assert d[:2]==b'\xff\xd8';i=2;headers=[]
 while i<len(d):
  assert d[i]==255;t=d[i+1];n=int.from_bytes(d[i+2:i+4],'big');seg=d[i:i+2+n];headers.append((t,seg));i+=n+2
  if t==0xda:break
 sof=next(v for t,v in headers if t==0xc0);assert struct.unpack('>HH',sof[5:9])==(64,64) and sof[9]==1
 dri=next((v for t,v in headers if t==0xdd),None);assert dri is not None and dri[-2:]==b'\x00\x08'
 scan=d[i:];segments=[];start=0;j=0
 while j<len(scan)-1:
  if scan[j]==255 and scan[j+1] in range(0xd0,0xd8):segments.append(scan[start:j]);start=j+2;j+=2
  elif scan[j:j+2]==b'\xff\xd9':segments.append(scan[start:j]);assert j+2==len(scan);break
  else:j+=1
 assert len(segments)==8;identity=b''.join(v for t,v in headers if t in [0xc0,0xc4,0xdb,0xdd,0xda]);return d[:i],segments,identity
for n in range(2):
 (r/f'source{n}.pgm').write_bytes(b'P5\n64 64\n255\n'+bytes((x*3+y*2+n*95)%256 for y in range(64) for x in range(64)));call(['cjpeg','-quality','85','-grayscale','-restart','8B','-outfile',str(r/f'source{n}.jpg'),str(r/f'source{n}.pgm')])
inputs=[parse((r/f'source{n}.jpg').read_bytes()) for n in range(2)];assert inputs[0][2]==inputs[1][2];segments=[inputs[y%2][1][y] for y in range(8)];candidate=inputs[0][0]+b''.join(b+(b'\xff'+bytes([0xd0+y%8]) if y<7 else b'\xff\xd9') for y,b in enumerate(segments));(r/'mosaic.jpg').write_bytes(candidate);assert parse(candidate)[1]==segments
pixels=[]
for name in ['source0','source1','mosaic']:
 raw=call(['ffmpeg','-v','error','-i',str(r/(name+'.jpg')),'-f','rawvideo','-pix_fmt','gray','-']);(r/(name+'.gray')).write_bytes(raw);pixels.append(raw)
expected=b''.join(pixels[(y//8)%2][y*64:(y+1)*64] for y in range(64));assert pixels[2]==expected
coefs=[json.loads(call(['build/catalogue-tools/jpeg-coefficients',str(r/(n+'.jpg'))])) for n in ['source0','source1','mosaic']];expectedblocks=[coefs[(y//8)%2]['blocks'][y] for y in range(64)];assert coefs[2]['blocks']==expectedblocks
rejected=[]
for name,args in [('wrong-quant',['-quality','70','-restart','8B']),('missing-restart',['-quality','85'])]:
 call(['cjpeg',*args,'-grayscale','-outfile',str(r/(name+'.jpg')),str(r/'source0.pgm')]);bad=False
 try:q=parse((r/(name+'.jpg')).read_bytes());assert q[2]==inputs[0][2]
 except (AssertionError,StopIteration):bad=True
 assert bad;rejected.append(name)
(r/'prepare-results.json').write_text(json.dumps({'complete_pixels_exact':True,'quantized_coefficients_exact':4096,'reused_entropy_segments':8,'segment_hashes':[hashlib.sha256(x).hexdigest() for x in segments],'validJPEG_admission_rejections':rejected,'wrong_rowplan_differs':pixels[0]!=expected},indent=2));(r/'commands.json').write_text(json.dumps(commands,indent=2))
