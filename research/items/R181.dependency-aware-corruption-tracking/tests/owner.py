# SPDX-License-Identifier: Apache-2.0
import pathlib,json,sys
p=pathlib.Path(sys.argv[1]);r=json.loads((p/'results.json').read_text())
class Trust:
 def __init__(self,case):self.source=r['sourceSha256'];self.generation=1;self.unknown=case['unknownTimes'];self.retired=False
 def publish(self,source,generation,pts):
  assert not self.retired and source==self.source and generation==self.generation
  return 'unknown' if any(abs(pts-t)<1e-5 for t in self.unknown) else 'clear'
 def retire(self):self.generation+=1;self.retired=True
out=[]
for c in r['cases']:
 t=Trust(c)
 assert all(t.publish(t.source,1,p)=='unknown' for p in c['missingTimes']+c['changedTimes'])
 assert all(t.publish(t.source,1,k/12)=='clear' for k in range(12,36))
 rejected=[]
 for source,gen in [('wrong',1),(t.source,0)]:
  try:t.publish(source,gen,1);raise RuntimeError('bad generation accepted')
  except AssertionError:rejected.append([source,gen])
 t.retire()
 try:t.publish(t.source,1,1);raise RuntimeError('retired accepted')
 except AssertionError:pass
 out.append({'case':c['case'],'allChangedMissingWithheld':True,'all24PostIDRPicturesClear':True,'sourceGenerationRejects':len(rejected),'retiredRejects':True})
(p/'owner-results.json').write_text(json.dumps(out,indent=2));print(out)
