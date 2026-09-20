# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,json,subprocess,hashlib,time,statistics,fractions,av
p=pathlib.Path(sys.argv[1]);helper=pathlib.Path('research/items/R121.native-reference-state-capsules-for-fast-seeking/tests/ipcm.py');tree=ast.parse(helper.read_text());scope={'re':__import__('re'),'bitsnum':4};exec(compile(ast.Module(body=[x for x in tree.body if isinstance(x,(ast.FunctionDef,ast.ClassDef)) and x.name in ['split','rbsp','escape','seed']],type_ignores=[]),str(helper),'exec'),scope)
class Writer:
 def __init__(self):self.data=bytearray();self.acc=0;self.n=0
 def u(self,n,v):
  for i in range(n-1,-1,-1):
   self.acc=self.acc<<1|(v>>i&1);self.n+=1
   if self.n==8:self.data.append(self.acc);self.acc=self.n=0
 def ue(self,v):n=(v+1).bit_length();self.u(n-1,0);self.u(n,v+1)
 def se(self,v):self.ue(-2*v if v<=0 else 2*v-1)
 def align(self):
  if self.n:self.data.append(self.acc<<(8-self.n));self.acc=self.n=0
 def byte(self,v):
  if self.n:self.u(8,v)
  else:self.data.append(v)
 def finish(self):self.u(1,1);self.align();return bytes(self.data)
scope['Writer']=Writer
source=pathlib.Path('research/items/R121.native-reference-state-capsules-for-fast-seeking/evidence/20260919T225800Z-ipcm-reference/source.h264').read_bytes();headers=[n for n in scope['split'](source) if n[0]&31 in [7,8]];assert len(headers)==2
colors=[(32+(i*23)%192,64+(i*7)%128,64+(i*13)%128) for i in range(60)];ops=[{'tick':i,'replace':None if i%3 else {'block':(i*7)%60,'color':[40+(i*19)%180,70+(i*11)%110,80+(i*17)%100]}} for i in range(1,30)]
def render(cs):
 b=bytearray(23040)
 for mb,color in enumerate(cs):
  mx,my=mb%10,mb//10
  for plane,(w,h,off,scale) in enumerate([(160,96,0,16),(80,48,15360,8),(80,48,19200,8)]):
   for y in range(scale):at=off+(my*scale+y)*w+mx*scale;b[at:at+scale]=bytes([color[plane]])*scale
 return bytes(b)
def validate(op,expected):
 if op['tick']!=expected:raise ValueError('timeline')
 r=op['replace']
 if r and (not isinstance(r['block'],int) or not 0<=r['block']<60 or len(r['color'])!=3 or any(not isinstance(v,int) or not 0<=v<=255 for v in r['color'])):raise ValueError('block/color')
def commands():
 ps=[b''.join(b'\0\0\0\1'+x for x in headers+[scope['seed'](render(colors))])]
 for i,op in enumerate(ops,1):
  validate(op,i);w=Writer();w.ue(0);w.ue(0);w.ue(0);w.u(4,i%16);w.u(1,0);w.u(1,0);w.u(1,0);w.se(0);w.ue(1);r=op['replace']
  if r:
   block=r['block'];w.ue(block);w.ue(30);w.align()
   for plane,n in enumerate([256,64,64]):
    for _ in range(n):w.byte(r['color'][plane])
   if block<59:w.ue(59-block)
  else:w.ue(60)
  ps.append(b'\0\0\0\1\x41'+scope['escape'](w.finish()))
 return ps
def ordinary():
 c=av.CodecContext.create('libx264','w');c.width=160;c.height=96;c.pix_fmt='yuv420p';c.time_base=fractions.Fraction(1,24);c.framerate=fractions.Fraction(24,1);c.options={'preset':'ultrafast','tune':'zerolatency','qp':'0','x264-params':'bframes=0:ref=1:weightp=0:keyint=999:scenecut=0'};c.open();cs=list(colors);ps=[];current=bytearray(render(colors))
 for i in range(30):
  if i:
   op=ops[i-1];validate(op,i)
   if op['replace']:
    mb=op['replace']['block'];color=op['replace']['color'];mx,my=mb%10,mb//10
    for plane,(w,h,off,scale) in enumerate([(160,96,0,16),(80,48,15360,8),(80,48,19200,8)]):
     for y in range(scale):at=off+(my*scale+y)*w+mx*scale;current[at:at+scale]=bytes([color[plane]])*scale
  raw=current;frame=av.VideoFrame(160,96,'yuv420p');frame.pts=i;frame.time_base=fractions.Fraction(1,24)
  for plane,off,w,h in [(frame.planes[0],0,160,96),(frame.planes[1],15360,80,48),(frame.planes[2],19200,80,48)]:
   tmp=bytearray(plane.buffer_size)
   for y in range(h):tmp[y*plane.line_size:y*plane.line_size+w]=raw[off+y*w:off+(y+1)*w]
   plane.update(tmp)
  ps.extend(bytes(x) for x in c.encode(frame))
 ps.extend(bytes(x) for x in c.encode(None));return ps
cs=list(colors);oracle=[]
for i in range(30):
 if i and ops[i-1]['replace']:cs[ops[i-1]['replace']['block']]=tuple(ops[i-1]['replace']['color'])
 oracle.append(render(cs))
variants={'candidate':commands(),'baseline':ordinary()};assert all(len(v)==30 for v in variants.values());results={}
for name,ps in variants.items():
 (p/(name+'.h264')).write_bytes(b''.join(ps));r=subprocess.run(['ffmpeg','-v','error','-i',str(p/(name+'.h264')),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=20);(p/(name+'-decode.log')).write_bytes(r.stderr);(p/(name+'.yuv')).write_bytes(r.stdout);assert r.stdout==b''.join(oracle),(name,r.stderr)
rows=[]
for pair in range(7):
 row={}
 for mode in (['candidate','baseline'] if pair%2 else ['baseline','candidate']):
  t=time.perf_counter();ps=commands() if mode=='candidate' else ordinary();assert ps==variants[mode];row[mode]=(time.perf_counter()-t)*1000
 rows.append(row)
controls={}
for name,op in [('out-of-bounds',{'tick':1,'replace':{'block':60,'color':[1,2,3]}}),('wrong-tick',{'tick':2,'replace':None}),('invalid-color',{'tick':1,'replace':{'block':0,'color':[256,2,3]}})]:
 try:validate(op,1);controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values());input={'packets':{k:[list(x) for x in v] for k,v in variants.items()},'codec':{k:'avc1.'+next(n for n in scope['split'](b''.join(v)) if n[0]&31==7)[1:4].hex() for k,v in variants.items()},'hashes':[hashlib.sha256(x).hexdigest() for x in oracle],'producerMs':rows,'codedBytes':{k:sum(map(len,v)) for k,v in variants.items()},'operations':ops,'controls':controls,'scope':'Producer-owned macroblock-aligned screen replace and whole-picture copy; CAVLC I_PCM replacement and skip-run commands. No scroll/motion-vector generalization, no motion estimation. Exact I420 source samples.'};(p/'input.json').write_text(json.dumps(input,indent=2)+'\n');print({'bytes':input['codedBytes'],'producerMs':rows})
