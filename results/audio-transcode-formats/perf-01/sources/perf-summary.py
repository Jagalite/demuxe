# SPDX-License-Identifier: Apache-2.0
"""Summarize this matched block only; rejected windows remain visible."""
import json,pathlib,statistics,subprocess,sys
root=pathlib.Path(sys.argv[1]);subprocess.run(['python3','tests/summarize-audio-path-counters.py',str(root/'result.json')],check=True)
r=json.load(open(root/'result.json'));c=json.load(open(root/'counter-summary.json'));groups={}
for lane in dict.fromkeys(t['lane'] for t in r['trials']):
 accepted=[t for t in c if t['lane']==lane and t['accepted']];allrows=[t for t in r['trials'] if t['lane']==lane]
 g={'accepted':len(accepted),'attempted':len(allrows),'cpuWindows':[t['cpu']['oneCorePercent'] for t in accepted],'rendererMIPSWindows':[t['roles']['renderer']['instructionsPerSecond']/1e6 for t in accepted],'rejections':[t for t in allrows if not t.get('accepted')]}
 if accepted:
  g['medianCPU']=statistics.median(g['cpuWindows']);g['medianRendererMIPS']=statistics.median(g['rendererMIPSWindows']);g['medianRendererGHz']=statistics.median(t['roles']['renderer']['activeGHz'] for t in accepted)
  g['medianRoleCPU']={role:statistics.median(t['cpu']['roles'].get(role,0) for t in accepted) for role in ['browser','renderer','gpu','audio','utility','other']}
 groups[lane]=g
comparisons=[]
for codec in ['ac3','eac3','dca']:
 a,b=groups.get(codec+'/auto',{}),groups.get(codec+'/flac24',{})
 if a.get('accepted') and b.get('accepted'):
  comparisons.append({'codec':codec,'autoCPU':a['medianCPU'],'flac24CPU':b['medianCPU'],'CPUPointReduction':a['medianCPU']-b['medianCPU'],'relativeCPUReductionPercent':100*(1-b['medianCPU']/a['medianCPU']),'rendererInstructionReductionPercent':100*(1-b['medianRendererMIPS']/a['medianRendererMIPS']),'autoRendererMIPS':a['medianRendererMIPS'],'flac24RendererMIPS':b['medianRendererMIPS'],'acceptedCounts':[a['accepted'],b['accepted']]})
summary={'scope':'Medians within one shared gated Chrome launch; two 8-second windows per path planned; no historical subtraction or universal normalization','groups':groups,'comparisons':comparisons}
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(comparisons,indent=2))
