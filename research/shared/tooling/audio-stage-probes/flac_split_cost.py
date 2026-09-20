# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,time,statistics,json
from flac_temporal_split import split,decode
p=pathlib.Path(sys.argv[1]);source=p/'source.flac';expected=(p/'reference.s16').read_bytes();times={'candidate':[],'baseline':[]};commands=[]
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();dest=p/'timed.flac'
  if variant=='candidate':dest.write_bytes(split(source.read_bytes()))
  else:
   cmd=['ffmpeg','-v','error','-y','-i',str(source),'-c:a','flac','-frame_size','2048',str(dest)];subprocess.run(cmd,check=True);commands.append(cmd)
  raw=decode(dest);ms=(time.perf_counter_ns()-start)/1e6;assert raw==expected
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];cost={'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9};(p/'cost-results.json').write_text(json.dumps(cost,indent=2))
with(p/'commands.log').open('a')as f:f.write('node research/shared/tooling/audio-stage-probes/flac_split_browser.mjs '+str(p)+'\npython3 research/shared/tooling/audio-stage-probes/flac_split_cost.py '+str(p)+'\n'+'\n'.join(map(json.dumps,commands))+'\n')
print(cost)
