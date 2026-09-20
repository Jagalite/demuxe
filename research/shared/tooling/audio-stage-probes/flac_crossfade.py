# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,array,ast,time,statistics,hashlib
from flac_bits import crc as fastcrc
src=pathlib.Path(__file__).with_name('flac_smart_cut.py');tree=ast.parse(src.read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['parts','utf8','rewrite','metadata']],type_ignores=[]),str(src),'exec'))
def crc(data,width,poly):return fastcrc(data,width)
BASE=['ffmpeg','-v','error','-y'];commands=[]
def run(args):
 r=subprocess.run(args,capture_output=True);commands.append({'args':args,'exit':r.returncode,'stderr':r.stderr.decode(errors='replace')});assert r.returncode==0,commands[-1];return r.stdout
def index(path):
 raw=path.read_bytes();info=json.loads(run(['ffprobe','-v','error','-show_packets','-of','json',str(path)]))['packets'];return raw,[(raw[int(x['pos']):int(x['pos'])+int(x['size'])],int(x['duration']))for x in info]
def pack(prefix,frames):
 out=[];at=0
 for f,n in frames:out.append(rewrite(f,at));at+=n
 return metadata(prefix,at,min(n for f,n in frames),max(n for f,n in frames))+b''.join(out)
def decode(path):
 a=array.array('h');a.frombytes(run(BASE+['-i',str(path),'-f','s16le','-']));return a
def encode(raw,path):
 temp=path.with_suffix('.s16');temp.write_bytes(raw.tobytes());run(BASE+['-f','s16le','-ar','48000','-ac','1','-i',str(temp),'-c:a','flac','-frame_size','4096',str(path)])
def mix(a,b):return array.array('h',[(int(x)*(11999-i)+int(y)*i)//11999 for i,(x,y)in enumerate(zip(a,b))])
def candidate(p,ids):
 sources=[p/'a.flac',p/'b.flac'];assert [hashlib.sha256(x.read_bytes()).hexdigest()for x in sources]==ids
 rawA,fa=index(sources[0]);rawB,fb=index(sources[1]);assert sum(n for f,n in fa)==96000 and sum(n for f,n in fb)==96000;assert all(n==4096 for f,n in fa[:-1]+fb[:-1]);assert rawA[18:21]==rawB[18:21]
 (p/'edge-a.flac').write_bytes(pack(rawA,fa[20:]));(p/'edge-b.flac').write_bytes(pack(rawB,fb[:3]));a=decode(p/'edge-a.flac');b=decode(p/'edge-b.flac');bridge=a[:2080]+mix(a[2080:],b[:12000])+b[12000:];assert len(bridge)==14368;encode(bridge,p/'bridge.flac');_,edge=index(p/'bridge.flac');selected=fa[:20]+edge+fb[3:];out=pack(rawA,selected);(p/'output.flac').write_bytes(out);return {'copiedFrames':len(fa[:20]+fb[3:]),'decodedSourceSamples':len(a)+len(b),'encodedBridgeSamples':len(bridge),'copiedPayloadsExact':all(parts(f)[2]==parts(rewrite(f,0))[2]for f,n in fa[:20]+fb[3:])}
def baseline(p):
 a=decode(p/'a.flac');b=decode(p/'b.flac');full=a[:84000]+mix(a[84000:],b[:12000])+b[12000:];encode(full,p/'baseline.flac');return full
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
(p/'protocol.json').write_text(json.dumps({'contract':'Two mono S16 48k sources96000 each; requested12000sample linear crossfade with exact floor((A*(11999-i)+B*i)/11999), output180000. Copy compressed unaffected subframes; decode only aligned edge sources and encode14368sample bridge. No resampling. Pure audio component; video/queue integration excluded.','cost':'Five alternating cold source identity/index/edge isolate/decode/mix/encode/reindex/reheader/write plus output decode versus full source decode/same integer operation/full encode/output decode, threshold candidate<=0.9.'},indent=2))
for name,freq in [('a',431),('b',631)]:run(BASE+['-f','lavfi','-i',f'aevalsrc=0.7*sin(2*PI*{freq}*t):s=48000:d=2','-sample_fmt','s16','-c:a','flac','-frame_size','4096',str(p/(name+'.flac'))])
ids=[hashlib.sha256((p/(x+'.flac')).read_bytes()).hexdigest()for x in ['a','b']];row=candidate(p,ids);reference=baseline(p);actual=decode(p/'output.flac');assert actual==reference and len(actual)==180000;(p/'reference.s16').write_bytes(reference.tobytes());seeks=[]
for at in [81919,83999,84000,95999,96288,179400]:
 path=p/'seek.s16';run(['flac','--silent','--force','--decode','--force-raw-format','--endian=little','--sign=signed',f'--skip={at}','--until=+512','-o',str(path),str(p/'output.flac')]);seeks.append({'sample':at,'exact':path.read_bytes()==reference[at:at+512].tobytes()})
assert all(x['exact']for x in seeks)
wrong=decode(p/'a.flac')+decode(p/'b.flac');assert wrong!=reference
try:candidate(p,['wrong',ids[1]]);identityReject=False
except AssertionError:identityReject=True
assert identityReject
(p/'results.json').write_text(json.dumps({**row,'outputSamples':len(actual),'wholePCMExact':True,'seeks':seeks,'wrongNoCrossfadeDetected':True,'wrongIdentityRejected':identityReject,'scope':'Host isolated mono integer FLAC bridge; no browser/video/queue/Wasm claims'},indent=2))
times={'candidate':[],'baseline':[]}
for trial in range(6):
 for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns()
  if variant=='candidate':candidate(p,ids);got=decode(p/'output.flac')
  else:baseline(p);got=decode(p/'baseline.flac')
  ms=(time.perf_counter_ns()-start)/1e6;assert got==reference
  if trial:times[variant].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));(p/'commands.log').write_text('\n'.join(json.dumps(x)for x in commands));print(row,med,ratio)
