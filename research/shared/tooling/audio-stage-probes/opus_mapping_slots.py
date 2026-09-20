# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,struct,json,hashlib,array,subprocess,time,statistics
source=pathlib.Path('research/shared/runs/20260919T224552Z-opus-streams/mono.ogg')
T=[]
for i in range(256):
 c=i<<24
 for _ in range(8):c=((c<<1)^0x04c11db7 if c&0x80000000 else c<<1)&0xffffffff
 T.append(c)
tree=ast.parse(pathlib.Path(__file__).with_name('opus_stream_extract.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['unpack','page']],type_ignores=[]),__file__,'exec'))
def mapping(raw,slots,identity,cancel=False):
 if cancel or hashlib.sha256(raw).hexdigest()!=identity:raise ValueError('identity/cancel')
 if slots not in[(0,0),(0,255)]:raise ValueError('slot intent')
 packets,gp=unpack(raw);head,tags,*coded=packets
 if head[:8]!=b'OpusHead' or head[9]!=1 or head[18]!=0:raise ValueError('mono profile')
 h=bytearray(head);h[9]=2;h[18]=1;h+=bytes([1,0,*slots]);return page(h,0,0,2)+page(tags,1,0,0)+b''.join(page(x,i+2,min((i+1)*960,gp),4 if i==len(coded)-1 else 0)for i,x in enumerate(coded))
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);raw=source.read_bytes();identity=hashlib.sha256(raw).hexdigest();mono=array.array('f');mono.frombytes(decode(source));rows=[]
(p/'protocol.json').write_text(json.dumps({'scope':'Actual mono OggOpus20ms family0 -> family1 streams1/coupled0 mappings[0,0]dualmono or[0,255]silentright, same coded packets/gain/preskip/endgranule.','cost':'Five alternating cold source read/hash/CRCverify/remap/repage/write/native host decode versus decode mono+duplicate/zero float PCM; exact same float endpoint <=0.9 median.'},indent=2))
for name,slots in [('dual',(0,0)),('silent',(0,255))]:
 out=mapping(raw,slots,identity);path=p/(name+'.ogg');path.write_bytes(out);expected=array.array('f',(v for x in mono for v in[x,x if name=='dual' else 0.]));actual=decode(path);assert unpack(out)[0][2:]==unpack(raw)[0][2:];rows.append({'mode':name,'frames':len(mono),'hostExact':actual==expected.tobytes(),'maxAbsoluteError':max(abs(a-b)for a,b in zip(array.array('f',actual),expected)),'codedPacketsUnchanged':True});(p/(name+'.reference.f32')).write_bytes(expected.tobytes())
controls={}
for name,args in [('wrongIdentity',{'identity':'wrong'}),('cancel',{'cancel':True}),('invalidSlot',{'slots':(0,1)})]:
 kw=dict(raw=raw,slots=(0,0),identity=identity);kw.update(args)
 try:mapping(**kw);controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values());(p/'results.json').write_text(json.dumps({'rows':rows,'controls':controls},indent=2));
(p/'cost-results.json').write_text(json.dumps({'status':'not_applicable','reason':'Required silent-slot fidelity fails default FFmpeg decoder; do not benchmark failed route.'},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/opus_mapping_slots.py '+str(p)+'\n');print(rows)
