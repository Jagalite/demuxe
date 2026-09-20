# SPDX-License-Identifier: Apache-2.0
import pathlib,ast,json,subprocess,time,statistics,hashlib,sys
out=pathlib.Path(sys.argv[1]);protocol=json.load(open(out/'protocol.json'));source=pathlib.Path('results/top100/transport/latm.py').read_text();tree=ast.parse(source);parts=[n for n in tree.body if isinstance(n,(ast.FunctionDef,ast.ClassDef)) and n.name in ['Bits','unwrap']];ns={};exec(compile(ast.Module(body=parts,type_ignores=[]),'<existing LATM definitions>','exec'),ns);slow=ns['unwrap']
# Same admitted grammar, extracting byte-aligned output in byte shifts rather than eight get(1) calls per payload byte.
optimized=ast.unparse(ast.Module(body=parts,type_ignores=[])).replace('payload = bytes((b.get(8) for _ in range(size)))','payload = b.payload(size)');fastns={};exec(optimized,fastns)
def payload(self,size):
 if self.p+size*8>len(self.b)*8:raise ValueError('Truncated LATM payload')
 at,shift=divmod(self.p,8);self.p+=size*8
 if shift==0:return self.b[at:at+size]
 return bytes(((self.b[at+i]<<shift)|(self.b[at+i+1]>>(8-shift)))&255 for i in range(size))
fastns['Bits'].payload=payload;fast=fastns['unwrap'];data=pathlib.Path('results/top100/transport/audio.latm').read_bytes();adts,config,frames=fast(data);assert adts==slow(data)[0];(out/'unwrapped.aac').write_bytes(adts)
cmd=['ffmpeg','-nostdin','-v','error','-i','pipe:0','-f','f32le','pipe:1'];commands=[]
def decode(b):
 p=subprocess.run(cmd,input=b,capture_output=True);assert p.returncode==0,p.stderr;return p.stdout
baseline=decode(data);candidate=decode(adts);assert baseline==candidate
controls={}
for name,bad in [('truncated',data[:-1]),('bad-sync',b'\0'+data[1:]),('missing-config',data[:3]+bytes([data[3]|128])+data[4:])]:
 try:fast(bad);controls[name]=False
 except ValueError:controls[name]=True
assert all(controls.values());rows=[]
for pair in range(-2,9):
 for mode in (['baseline','candidate'] if pair%2==0 else ['candidate','baseline']):
  start=time.perf_counter();parse_start=start;b=data if mode=='baseline' else fast(data)[0];parsed=time.perf_counter()-parse_start;pcm=decode(b);elapsed=time.perf_counter()-start;assert pcm==baseline
  if pair>=0:rows.append({'pair':pair,'mode':mode,'wall_seconds':elapsed,'unwrap_seconds':parsed if mode=='candidate' else 0,'input_bytes':len(b),'output_bytes':len(pcm)})
a=[r['wall_seconds'] for r in rows if r['mode']=='baseline'];b=[r['wall_seconds'] for r in rows if r['mode']=='candidate'];ratio=statistics.median(b)/statistics.median(a);result={'candidate_executed':True,'fallback':False,'fresh_correctness_passed':True,'frames':frames,'configuration':config,'pcm_bytes':len(baseline),'pcm_sha256':hashlib.sha256(baseline).hexdigest(),'bitwise_parser_output_exact':True,'adverse_controls':controls,'rows':rows,'baseline_median_seconds':statistics.median(a),'candidate_median_seconds':statistics.median(b),'median_ratio':ratio,'baseline_range_seconds':[min(a),max(a)],'candidate_range_seconds':[min(b),max(b)],'performance_threshold_passed':ratio<=1.10,'scope':protocol['profile'],'limits':protocol['excluded_costs'],'ffmpeg_version':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]};(out/'results.json').write_text(json.dumps(result,indent=2)+'\n');(out/'commands.log').write_text(json.dumps(cmd)+' # stdin original LATM or optimized ADTS; repeated per protocol\n');print(json.dumps({k:v for k,v in result.items() if k!='rows'}))
