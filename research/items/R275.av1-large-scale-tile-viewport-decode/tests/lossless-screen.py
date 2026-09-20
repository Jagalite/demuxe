# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,time,struct,hashlib,random,statistics
root=Path.cwd();out=Path(__import__('sys').argv[1]);out.mkdir(exist_ok=True);commands=[]
def call(args):
 commands.append(' '.join(map(str,args)));r=subprocess.run(list(map(str,args)),capture_output=True);(out/'commands.log').write_text('\n'.join(commands)+'\n');return r
W=H=512
planes=[bytes((x*3+y*5+c*61+(x//32)*17)%256 for y in range(h) for x in range(w)) for c,(w,h) in enumerate([(W,H),(W//2,H//2),(W//2,H//2)])];raw=b''.join(planes);(out/'source.yuv').write_bytes(raw);(out/'source.y4m').write_bytes(b'YUV4MPEG2 W512 H512 F24:1 Ip A1:1 C420jpeg\nFRAME\n'+raw)
expected=b''.join(b''.join(p[y*w+w//2:y*w+w] for y in range(h//2,h)) for p,(w,h) in zip(planes,[(512,512),(256,256),(256,256)]));(out/'oracle.yuv').write_bytes(expected)
plan={'scope':'Lossless prepared512x512 large-scale tile, bottom-right256x256 selected versus full decode/crop. Independent source pixels oracle, not another path through same decoder. Thirty repeated independently coded keyframes; both owners output identical cropped bytes.','correctness':'Both complete outputs exact source; wrong tile differs; malformed short payload fails, fresh process after failure exact. Restricted coordinate guard rejects out-of-range.','performance':'Nine alternating order fresh process pairs. Wall time includes process/library startup, IVF read, decode, ROI write, destruction and output validation. Prepared encoding excluded; all source bytes read by both. 10000 paired bootstrap resamples seed2751; lower95 saving>=10%. No browser, sparse transport or energy claim.'};(out/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
r=call(['build/catalogue-tools/aom-build/aomenc','--good','--cpu-used=6','--limit=1','--lossless=1','--large-scale-tile=1','--tile-columns=1','--tile-rows=1','--ivf','-o',out/'one.ivf',out/'source.y4m']);(out/'encode.log').write_bytes(r.stderr);assert r.returncode==0
b=(out/'one.ivf').read_bytes();n=struct.unpack_from('<I',b,32)[0];payload=b[44:44+n];assert len(payload)==n
header=bytearray(b[:32]);struct.pack_into('<I',header,24,30);(out/'sequence.ivf').write_bytes(header+b''.join(struct.pack('<IQ',n,i)+payload for i in range(30)));(out/'truncated.ivf').write_bytes(header+struct.pack('<IQ',n,0)+payload[:len(payload)//2]);expected30=expected*30
binary=root/'build/catalogue-tools/tile-lossless-screen'
r=call(['cc','-O2','-I','build/catalogue-tools/aom','research/items/R275.av1-large-scale-tile-viewport-decode/tests/lossless-decode.c','build/catalogue-tools/aom-build/libaom.a','-lc++','-lm','-o',binary]);(out/'compile.log').write_bytes(r.stderr);assert r.returncode==0

def trial(candidate,label):
 target=out/(label+'.yuv');start=time.perf_counter();r=call([binary,out/'sequence.ivf',target,1 if candidate else 0,1,1]);data=target.read_bytes();assert r.returncode==0 and data==expected30,(label,r.stderr,len(data));return {'candidate':candidate,'wall_ms':(time.perf_counter()-start)*1000,'exact':True,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'exit':r.returncode}
checks=[trial(False,'correct-full'),trial(True,'correct-tile')]
controls=[]
for label,source,row,col in [('truncated',out/'truncated.ivf',1,1),('invalid-coordinate',out/'sequence.ivf',2,1),('wrong-tile',out/'sequence.ivf',0,0)]:
 target=out/(label+'.yuv');r=call([binary,source,target,1,row,col]);data=target.read_bytes() if target.exists() else b'';controls.append({'label':label,'exit':r.returncode,'does_not_match_oracle':data!=expected30,'stderr':r.stderr.decode()});assert data!=expected30
assert controls[0]['exit'] and controls[1]['exit'];recovery=trial(True,'recreated-after-failure');pairs=[]
for i in range(9):
 p={'pair':i}
 for c in ([True,False] if i%2 else [False,True]):p['candidate' if c else 'baseline']=trial(c,f'pair{i}-'+('tile' if c else 'full'))
 pairs.append(p)
r=random.Random(2751);bs=[x['baseline']['wall_ms'] for x in pairs];cs=[x['candidate']['wall_ms'] for x in pairs];boot=[]
for _ in range(10000):
 ids=[r.randrange(9) for _ in range(9)];boot.append(100*(1-sum(cs[i] for i in ids)/sum(bs[i] for i in ids)))
boot.sort();result={'correctness':checks,'controls':controls,'recovery':recovery,'pairs':pairs,'baseline_mean_ms':statistics.mean(bs),'candidate_mean_ms':statistics.mean(cs),'saving_percent':100*(1-sum(cs)/sum(bs)),'bootstrap95':[boot[250],boot[9749]],'performance_pass':boot[250]>=10,'passed_correctness':True};(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['pairs','correctness']},indent=2))
