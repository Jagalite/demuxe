# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,re,time,statistics,random,json,sys,hashlib
out=pathlib.Path(sys.argv[1]);source=pathlib.Path('results/full-completion/r225/source.h264');frame=160*96*3//2
def decode(b):return subprocess.check_output(['ffmpeg','-v','error','-f','h264','-i','pipe:0','-pix_fmt','yuv420p','-f','rawvideo','-'],input=b)
full=decode(source.read_bytes());oracle=full[24*frame:];result={'plan':json.loads((out/'plan.json').read_text()),'rows':[]}
for pair in range(11):
 row={'pair':pair}
 for mode in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
  start=time.perf_counter();b=source.read_bytes();offset=0
  if mode=='candidate':
   starts=[m.start() for m in re.finditer(b'\x00\x00\x00\x01|\x00\x00\x01',b)];units=[]
   for p in starts:
    prefix=4 if b[p:p+4]==b'\0\0\0\1' else 3;units.append((p,b[p+prefix]&31))
   boundaries=[i for i,(_,typ) in enumerate(units) if typ==7];i=boundaries[1];assert [typ for _,typ in units[i:i+3]]==[7,8,5];offset=units[i][0];b=b[offset:]
  raw=decode(b)
  if mode=='baseline':raw=raw[24*frame:]
  ms=(time.perf_counter()-start)*1000;assert raw==oracle;row[mode]={'ms':ms,'sourceReadBytes':source.stat().st_size,'decoderInputBytes':len(b),'offset':offset,'frames':len(raw)//frame,'exact':True}
 result['rows'].append(row)
values=[1-r['candidate']['ms']/r['baseline']['ms'] for r in result['rows']];rng=random.Random(225);bs=sorted(statistics.median(rng.choices(values,k=11)) for _ in range(10000));result['analysis']={'medianSaving':statistics.median(values),'bootstrap95':[bs[250],bs[9750]],'accepted':bs[250]>.05};result['oracleSHA256']=hashlib.sha256(oracle).hexdigest();(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(result['analysis'])
