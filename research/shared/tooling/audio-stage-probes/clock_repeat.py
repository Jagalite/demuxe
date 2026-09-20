# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,statistics,sys
p=pathlib.Path(sys.argv[1]);rows=[]
for pair in range(3):
 for mode in (['baseline','feedback'] if pair%2==0 else ['feedback','baseline']):
  x=subprocess.run(['node','research/shared/tooling/audio-stage-probes/clock_feedback.mjs',str(p),mode],capture_output=True,text=True);d=json.loads((p/(mode+'-result.json')).read_text());(p/(str(pair)+'-'+mode+'.json')).write_text(json.dumps(d,indent=2)+'\n');
  vals=[]
  for phase in ['initial','seek','rate','recovered']:vals.extend(abs(r['driftSeconds']) for r in [r for r in d['probe']['rows'] if r['phase']==phase][5:])
  rows.append({'pair':pair,'mode':mode,'passed':d.get('passed',False),'p95':sorted(vals)[int(.95*(len(vals)-1))],'max':max(vals),'controllerMs':d['probe']['controllerMs'],'controllerCalls':d['probe']['controllerCalls'],'exitCode':x.returncode})
base=statistics.median(r['p95'] for r in rows if r['mode']=='baseline');cand=statistics.median(r['p95'] for r in rows if r['mode']=='feedback');d={'rows':rows,'baselineMedianP95':base,'candidateMedianP95':cand,'correctnessPassed':all(r['passed'] for r in rows if r['mode']=='feedback'),'performancePassed':cand<=base and all(r['max']<=.035 for r in rows if r['mode']=='feedback')};(p/'results.json').write_text(json.dumps(d,indent=2)+'\n');print(d)
