# SPDX-License-Identifier: Apache-2.0
import ast,pathlib,json,sys,subprocess,time,statistics,hashlib
out=pathlib.Path(sys.argv[1]);source=pathlib.Path('research/shared/runs/20260919T201317Z-flac-smart-cut/source.flac');ref=source.with_name('reference.s16').read_bytes();start,end=41737,105565;commands=[]
def run(args):
 p=subprocess.run(args,capture_output=True);commands.append({'args':list(map(str,args)),'exit':p.returncode,'stderr':p.stderr.decode(errors='replace')});assert p.returncode==0,commands[-1];return p.stdout
base=['ffmpeg','-nostdin','-v','error','-y']
tree=ast.parse(pathlib.Path('research/shared/tooling/audio-stage-probes/flac_smart_cut.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['crc','parts','utf8','rewrite','metadata']],type_ignores=[]),'<reused-original-smart-cut-helpers>','exec'))
def packets(p):return json.loads(run(['ffprobe','-v','error','-show_packets','-of','json',str(p)]))['packets']
def baseline(target):run(base+['-i',str(source),'-af',f'atrim=start_sample={start}:end_sample={end},asetpts=PTS-STARTPTS','-c:a','flac',str(target)])
def candidate(target):
 data=source.read_bytes();ps=packets(source);prefix=data[:int(ps[0]['pos'])];selected=[];edges=0;interior=0
 for p in ps:
  t,n=int(p['pts']),int(p['duration']);lo,hi=max(start,t),min(end,t+n)
  if lo>=hi:continue
  f=data[int(p['pos']):int(p['pos'])+int(p['size'])]
  if lo==t and hi==t+n:selected.append((f,n));interior+=1;continue
  edges+=1;isolated=out/'working-edge.flac';isolated.write_bytes(metadata(prefix,n,n,n)+rewrite(f,0));raw=run(base+['-i',str(isolated),'-c:a','pcm_s16le','-f','s16le','pipe:1']);clip=out/'working-edge.s16';clip.write_bytes(raw[(lo-t)*2:(hi-t)*2]);enc=out/'working-encoded.flac';run(base+['-f','s16le','-ar','48000','-ac','1','-i',str(clip),'-c:a','flac',str(enc)]);eb=enc.read_bytes()
  for ep in packets(enc):selected.append((eb[int(ep['pos']):int(ep['pos'])+int(ep['size'])],int(ep['duration'])))
 at=0;frames=[]
 for f,n in selected:frames.append(rewrite(f,at));at+=n
 assert at==end-start and edges==2 and interior==12
 target.write_bytes(metadata(prefix,at,min(n for _,n in selected),max(n for _,n in selected))+b''.join(frames))
def validate(p):return run(base+['-i',str(p),'-c:a','pcm_s16le','-f','s16le','pipe:1'])==ref
rows=[]
for pair in range(-2,5):
 for mode in (['candidate','baseline'] if pair%2 else ['baseline','candidate']):
  p=out/f'{pair}-{mode}.flac';t=time.perf_counter();globals()[mode](p);wall=time.perf_counter()-t;exact=validate(p);assert exact
  rows.append({'pair':pair,'mode':mode,'wallSeconds':wall,'outputBytes':p.stat().st_size,'pcmExact':exact,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
b=statistics.median(x['wallSeconds'] for x in rows if x['pair']>=0 and x['mode']=='baseline');c=statistics.median(x['wallSeconds'] for x in rows if x['pair']>=0 and x['mode']=='candidate');d={'rows':rows,'baselineMedianSeconds':b,'candidateMedianSeconds':c,'ratio':c/b,'correctnessPassed':True,'performancePassed':c<=.9*b,'preTimingCorrectnessPair':-2,'warmupPair':-1};(out/'results.json').write_text(json.dumps(d,indent=2)+'\n');(out/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');print(json.dumps({k:v for k,v in d.items() if k!='rows'}))
