# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys,hashlib,re,time,statistics,ast
p=pathlib.Path(sys.argv[1]);browser=json.loads((p/'browser-results.json').read_text());assert browser['completed'];cmds=[]
def call(a):cmds.append(a);return subprocess.run(a,check=True,capture_output=True)
tree=ast.parse(pathlib.Path('research/shared/tooling/audio-stage-probes/disabled_track_fixture.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='prep'],type_ignores=[]),'prep','exec'))
# Explicit enum, separate from ordinary mute. Source identity is checked before preparation.
source_hash=hashlib.sha256((p/'source.mkv').read_bytes()).hexdigest();epoch=1;published=[]
def admit(intent,source):
 if source!=source_hash:raise ValueError('source identity')
 if intent not in ['disabled','muted','audio-only']:raise ValueError('explicit intent')
 return intent
for intent,source in [('disabled','wrong'),('automatic',source_hash)]:
 try:admit(intent,source);raise RuntimeError('bad intent accepted')
 except ValueError:pass
args=['ffmpeg','-v','error','-y','-i',str(p/'source.mkv'),'-map','0:a:0','-c:a','flac',str(p/'late.flac')];job=subprocess.Popen(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE);jobepoch=epoch;epoch+=1;job.communicate();assert job.returncode==0
if jobepoch==epoch:published.append('late')
assert not published
rows=[];counter={}
for i in range(6):
 for mode in (['disabled','muted'] if i%2==0 else ['muted','disabled']):
  t=time.perf_counter();admit(mode,hashlib.sha256((p/'source.mkv').read_bytes()).hexdigest());log=prep(mode,p/('cost-'+mode+'.mp4'));ms=(time.perf_counter()-t)*1000
  if i:rows.append({'pair':i,'mode':mode,'ms':ms})
  counter[mode]={'decodedAudioSamples':sum(int(n) for n in re.findall(r'frames decoded; 0 decode errors \((\d+) samples\)',log)),'encodedAudioSamples':sum(int(n) for n in re.findall(r'frames encoded \((\d+) samples\)',log)),'audioStreamReported':'Input stream #0:1 (audio)' in log}
assert counter['disabled']['decodedAudioSamples']==counter['disabled']['encodedAudioSamples']==0 and counter['muted']['decodedAudioSamples']==counter['muted']['encodedAudioSamples']==96768
c=statistics.median(r['ms'] for r in rows if r['mode']=='disabled');b=statistics.median(r['ms'] for r in rows if r['mode']=='muted');r={'rows':rows,'counters':counter,'lateCompletedJobRejected':True,'sourceMismatchRejected':True,'ambiguousSelectionRejected':True,'disabledMedianMs':c,'mutedMedianMs':b,'ratio':c/b,'costPassed':c/b<=.9,'primaryWorkEliminationPassed':True,'scope':'Configured research quantized24FLAC muted comparator from established bound, no sample-exact float admission; no browser decoder CPU counter claim.'};(p/'cost-results.json').write_text(json.dumps(r,indent=2));(p/'cost-commands.log').write_text('\n'.join(map(json.dumps,cmds))+ '\n'+json.dumps(args)+'\n');print(r)
