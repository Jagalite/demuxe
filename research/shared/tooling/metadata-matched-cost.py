# SPDX-License-Identifier: Apache-2.0
import pathlib,ast,subprocess,json,time,statistics,random,hashlib,sys
out=pathlib.Path(sys.argv[1]);plan=json.loads((out/'plan.json').read_text())
def functions(path):
 ns={};tree=ast.parse(pathlib.Path(path).read_text());tree.body=[n for n in tree.body if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef))];exec(compile(tree,path,'exec'),ns);return ns
view=functions('results/full-completion/r59/track_view.py')['select'];ts=functions('results/top100/program/probe.py')['select']
def ff(args,data):return subprocess.run(['ffmpeg','-v','error','-nostdin',*args],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True).stdout
def decode(b):return (ff(['-i','pipe:0','-map','0:v:0','-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],b),ff(['-i','pipe:0','-map','0:a:0','-f','f32le','-'],b))
def summary(rows):
 vals=[1-r['candidate']['ms']/r['baseline']['ms'] for r in rows];rng=random.Random(610);bs=sorted(statistics.median(rng.choices(vals,k=len(vals))) for _ in range(10000));return {'medianSaving':statistics.median(vals),'bootstrap95':[bs[250],bs[9750]],'accepted':bs[250]>.05}
result={'plan':plan,'profiles':{}}
for name,src,adapter,mapping in [('track-view','results/full-completion/r59/two-front.mp4',lambda b:view(b)[0],['-map','0:v:0','-map','0:a:1']),('ts-program','results/top100/program/multi.ts',lambda b:ts(b,202)[0],['-map','0:p:202'])]:
 source=pathlib.Path(src).read_bytes();reference=pathlib.Path('results/full-completion/r59/selected-reference.mp4').read_bytes() if name=='track-view' else ff(['-i','pipe:0',*mapping,'-c','copy','-movflags','frag_keyframe+empty_moov+default_base_moof','-f','mp4','-'],source);oracle=decode(reference);rows=[]
 for pair in range(9):
  row={'pair':pair}
  for mode in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
   start=time.perf_counter();data=pathlib.Path(src).read_bytes()
   if mode=='baseline' and name=='track-view':
    dest=out/'selected-temp.mp4';subprocess.run(['ffmpeg','-v','error','-y','-i','pipe:0',*mapping,'-c','copy',str(dest)],input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True);prepared=dest.read_bytes();dest.unlink()
   elif mode=='baseline':prepared=ff(['-i','pipe:0',*mapping,'-c','copy','-movflags','frag_keyframe+empty_moov+default_base_moof','-f','mp4','-'],data)
   elif name=='track-view':prepared=adapter(data)
   else:prepared=ff(['-i','pipe:0','-map','0:v:0','-map','0:a:0','-c','copy','-movflags','frag_keyframe+empty_moov+default_base_moof','-f','mp4','-'],adapter(data))
   raw=decode(prepared);ms=(time.perf_counter()-start)*1000;assert raw==oracle,(name,mode,'full A/V oracle');row[mode]={'ms':ms,'inputBytes':len(data),'preparedBytes':len(prepared),'videoBytes':len(raw[0]),'pcmBytes':len(raw[1]),'exact':True}
  rows.append(row)
 result['profiles'][name]={'rows':rows,'analysis':summary(rows),'sourceSHA256':hashlib.sha256(source).hexdigest(),'oracleHashes':[hashlib.sha256(x).hexdigest() for x in oracle]};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v['analysis'] for k,v in result['profiles'].items()}))
