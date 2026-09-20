# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,time,statistics,hashlib,ast,struct,array
BASE=pathlib.Path('/opt/homebrew/opt/jpeg-turbo/bin');SOURCE=pathlib.Path('research/shared/runs/20260920T003439Z-huffman-special');tree=ast.parse(pathlib.Path(__file__).with_name('huffman_prepare.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='parse'],type_ignores=[]),__file__,'exec'));commands=[]
def run(args):
 r=subprocess.run(list(map(str,args)),capture_output=True);commands.append({'args':list(map(str,args)),'exit':r.returncode,'stderr':r.stderr.decode(errors='replace')});assert r.returncode==0,commands[-1];return r.stdout
def decode(path):return run([BASE/'djpeg','-grayscale','-pnm',path])
def encode(pixels,w,h,path):
 pgm=path.with_suffix('.pgm');pgm.write_bytes(f'P5\n{w} {h}\n255\n'.encode()+pixels);run([BASE/'cjpeg','-quality','83','-outfile',path,pgm])
def quant(raw):
 at=2
 while at<len(raw):
  marker=raw[at+1];n=int.from_bytes(raw[at+2:at+4],'big');data=raw[at+4:at+n+2];at+=n+2
  if marker==219:return data
 raise ValueError('DQT')
def admit(source,overlay,x=40,y=48):
 if x%8 or y%8 or x<0 or y<0 or x+32>128 or y+16>128:raise ValueError('alignment/bounds')
 if quant(source)!=quant(overlay):raise ValueError('fixed quantization')
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);overlay=bytes((220 if(x//4+y//4)%2 else 40)for y in range(16)for x in range(32));encode(overlay,32,16,p/'overlay.jpg');patch=(p/'overlay.jpg').read_bytes();patchCoef=array.array('h',run([SOURCE/'oracle','c',p/'overlay.jpg']));patchDecoded=decode(p/'overlay.jpg')[-512:];rows=[]
(p/'protocol.json').write_text(json.dumps({'scope':'Existing libjpeg-turbo cjpeg fixedQ83 + jpegtran coefficient-drop primitive, requested opaque32x16grayscale overlay at(40,48), aligned8x8blocks. Original sourcecoefficients outside8changed blocks preserved. Actual outputJPEG serialization and decode included. No chroma or partial-block alpha blending claim.','baseline':'Conventional full-image decode/paint/reencode at sameQ, then crop encoded overlay and coefficient-drop into original to satisfy identical untouched-coefficient contract; ordinary full reencode alone violates that contract. Both use installed library primitives; this is route selection, not a novel coefficient algorithm.','cost':'Five alternating four-frame complete operations including overlay encode/read/hash/encode/drop/outputdecode versus matched full-image render/encode/crop/drop/outputdecode;<=0.9median. Full-image entropy serialization charged both.'},indent=2))
def perform(name,variant):
 src=SOURCE/(name+'.jpg');raw=src.read_bytes();assert hashlib.sha256(raw).hexdigest()==identities[name]
 if variant=='candidate':
  encode(overlay,32,16,p/'timed-overlay.jpg');admit(raw,(p/'timed-overlay.jpg').read_bytes());patchPath=p/'timed-overlay.jpg'
 else:
  pcm=bytearray(decode(src)[-16384:])
  for y in range(16):pcm[(y+48)*128+40:(y+48)*128+72]=overlay[y*32:(y+1)*32]
  encode(pcm,128,128,p/'full.jpg');admit(raw,(p/'full.jpg').read_bytes());run([BASE/'jpegtran','-crop','32x16+40+48','-outfile',p/'crop.jpg',p/'full.jpg']);patchPath=p/'crop.jpg'
 out=p/(name+'-'+variant+'.jpg');run([BASE/'jpegtran','-drop','+40+48',patchPath,'-outfile',out,src]);return decode(out)[-16384:]
identities={f'frame{i}':hashlib.sha256((SOURCE/f'frame{i}.jpg').read_bytes()).hexdigest()for i in range(4)}
for name in identities:
 result=perform(name,'candidate');baseline=perform(name,'baseline');assert result==baseline;srcPixels=(SOURCE/(name+'.gray')).read_bytes();srcCoef=array.array('h',(SOURCE/(name+'.coeff')).read_bytes());outCoef=array.array('h',run([SOURCE/'oracle','c',p/(name+'-candidate.jpg')]));untouched=changed=0
 for by in range(16):
  for bx in range(16):
   block=(by*16+bx)*64
   if 6<=by<8 and 5<=bx<9:
    at=((by-6)*4+bx-5)*64;assert outCoef[block:block+64]==patchCoef[at:at+64];changed+=1
   else:assert outCoef[block:block+64]==srcCoef[block:block+64];untouched+=1
 for y in range(128):
  for x in range(128):assert result[y*128+x]==(patchDecoded[(y-48)*32+x-40] if 48<=y<64 and 40<=x<72 else srcPixels[y*128+x])
 rows.append({'name':name,'untouchedCoefficientBlocksExact':untouched,'overlayCoefficientBlocksExact':changed,'outsidePixelsExact':True,'insideMatchesIndependentOverlayDecode':True});(p/(name+'.reference.gray')).write_bytes(result)
controls={}
try:admit((SOURCE/'frame0.jpg').read_bytes(),patch,41,48);controls['unaligned']=False
except ValueError:controls['unaligned']=True
bad=bytearray(patch);at=bad.index(b'\xff\xdb');bad[at+5]^=1
try:admit((SOURCE/'frame0.jpg').read_bytes(),bad);controls['quantizer']=False
except ValueError:controls['quantizer']=True
assert all(controls.values());times={'candidate':[],'baseline':[]}
for trial in range(5):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns()
  for name in identities:assert perform(name,variant)==(p/(name+'.reference.gray')).read_bytes()
  times[variant].append((time.perf_counter_ns()-start)/1e6)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'results.json').write_text(json.dumps({'rows':rows,'controls':controls,'implementation':'Existing cjpeg + jpegtran -drop selective coefficient operation, no custom entropy writer'},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));(p/'commands.log').write_text('\n'.join(json.dumps(x)for x in commands));print(rows,med,ratio)
