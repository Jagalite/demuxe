# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,struct,hashlib,array,time,statistics,json,subprocess
p=pathlib.Path(sys.argv[1]);src=pathlib.Path(__file__).with_name('opus_stream_extract.py').read_text();tree=ast.parse(src)
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['unpack','components','selfdelim','page','extract']],type_ignores=[]),str(__file__),'exec'))
T=[]
for i in range(256):
 c=i<<24
 for _ in range(8):c=((c<<1)^0x04c11db7 if c&0x80000000 else c<<1)&0xffffffff
 T.append(c)
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
def baseline(channels):
 a=array.array('f');a.frombytes(decode(p/'source.ogg'));out=array.array('f',[0])*(len(a)//6*len(channels))
 for j,c in enumerate(channels):out[j::len(channels)]=a[c::6]
 return out.tobytes()
rows=[]
for mode,channels in [('mono',[2]),('stereo',[0,1]),('three',[0,1,2])]:
 expected=baseline(channels);times={'candidate':[],'baseline':[]}
 for trial in range(6):
  for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   start=time.perf_counter_ns()
   if variant=='candidate':
    output,_=extract((p/'source.ogg').read_bytes(),mode);dest=p/('cost-'+mode+'.ogg');dest.write_bytes(output);raw=decode(dest)
   else:raw=baseline(channels)
   ms=(time.perf_counter_ns()-start)/1e6
   assert raw==expected,(mode,variant,trial)
   if trial:times[variant].append(ms)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];rows.append({'mode':mode,'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9,'everyTrialPCMExact':True});print(rows[-1],flush=True)
(p/'cost-results.json').write_text(json.dumps({'setup':'One warmup per mode; CRC table initialized before timed calls. Cold source read/parse/CRC/coded selection/file write/host decode versus fresh full host decode and efficient array channel selection. Five alternating pairs; same exact float endpoint.','threshold':.9,'rows':rows},indent=2))
with(p/'commands.log').open('a')as f:f.write('node research/shared/tooling/audio-stage-probes/opus_stream_browser.mjs '+str(p)+'\npython3 research/shared/tooling/audio-stage-probes/opus_stream_cost.py '+str(p)+'\n')
