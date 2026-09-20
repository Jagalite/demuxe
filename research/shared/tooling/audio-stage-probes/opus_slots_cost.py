# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,struct,json,hashlib,array,subprocess,time,statistics
p=pathlib.Path(sys.argv[1]);source=pathlib.Path('research/shared/runs/20260919T224552Z-opus-streams/mono.ogg');T=[]
for i in range(256):
 c=i<<24
 for _ in range(8):c=((c<<1)^0x04c11db7 if c&0x80000000 else c<<1)&0xffffffff
 T.append(c)
for filename,names in [('opus_stream_extract.py',['unpack','page']),('opus_mapping_slots.py',['mapping'])]:
 tree=ast.parse(pathlib.Path(__file__).with_name(filename).read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in names],type_ignores=[]),filename,'exec'))
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-c:a','libopus','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
raw=source.read_bytes();identity=hashlib.sha256(raw).hexdigest();mono=array.array('f',decode(source));cost=[]
(p/'libopus-protocol.json').write_text(json.dumps({'scope':'Default FFmpeg Opus decoder wrongly silences both channels for mapping[0,255], so this is separately admitted libopus and Chrome mapping profile. Same-consumer mono expansion oracle; no default decoder admission.','cost':'Five alternating source-read/hash/CRC/remapping/repage/write/libopusdecode versus mono libopusdecode+PCM slots, same float endpoint;<=0.9 median.'},indent=2))
for name,slots in [('dual',(0,0)),('silent',(0,255))]:
 expected=array.array('f',(v for x in mono for v in[x,x if name=='dual' else 0.])).tobytes();assert decode(p/(name+'.ogg'))==expected;times={'candidate':[],'baseline':[]}
 for trial in range(6):
  for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   start=time.perf_counter_ns();data=source.read_bytes();assert hashlib.sha256(data).hexdigest()==identity
   if variant=='candidate':(p/'timed.ogg').write_bytes(mapping(data,slots,identity));out=decode(p/'timed.ogg')
   else:
    a=array.array('f',decode(source));expanded=array.array('f',[0.])*(2*len(a));expanded[::2]=a
    if name=='dual':expanded[1::2]=a
    out=expanded.tobytes()
   ms=(time.perf_counter_ns()-start)/1e6;assert out==expected
   if trial:times[variant].append(ms)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];cost.append({'mode':name,'sameConsumerPCMExact':True,'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9})
(p/'libopus-cost-results.json').write_text(json.dumps(cost,indent=2))
with(p/'commands.log').open('a')as f:f.write('node research/shared/tooling/audio-stage-probes/opus_slots_browser.mjs '+str(p)+'\npython3 research/shared/tooling/audio-stage-probes/opus_slots_cost.py '+str(p)+'\n')
print(cost)
