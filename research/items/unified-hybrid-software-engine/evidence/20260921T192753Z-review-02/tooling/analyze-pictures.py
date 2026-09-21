# SPDX-License-Identifier: Apache-2.0
from run_guard import resolve_run, require_writable_run
from pathlib import Path
import json,subprocess,hashlib
base=Path('research/items/unified-hybrid-software-engine');out=resolve_run(base);old=Path('research/items/granular-engine-loading/evidence/20260921T162900Z-screen-01');rows=[]
require_writable_run(out)
def rgb(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-vf','scale=320:180:flags=area','-pix_fmt','rgb24','-f','rawvideo','-'])
def mae(a,b):
 assert len(a)==len(b),(len(a),len(b))
 return sum(abs(x-y) for x,y in zip(a,b))/len(a)
for p in sorted(out.glob('correctness-*/result.json')):
 r=json.loads(p.read_text());d=p.parent
 if not r['passed']:rows.append({'path':str(p),'passed':False,'reason':r.get('error')});continue
 fixture=r['fixture'];pic=rgb(d/'frame-3-no-sub.png')
 if fixture=='user':
  oracle=out/'fixtures/user-3.rgb'
  if not oracle.exists():subprocess.run(['ffmpeg','-v','error','-nostdin','-n','-i',r['fixturePath'],'-ss','3','-vf','scale=320:180','-frames:v','1','-pix_fmt','rgb24','-f','rawvideo',str(oracle)],check=True)
 elif fixture=='h264':oracle=old/'fixtures-v2/oracle-3.rgb'
 else:oracle=out/f'fixtures/{fixture}-3.rgb'
 ref=oracle.read_bytes();error=mae(pic,ref);negative=mae(pic,bytes(255-x for x in ref));on=rgb(d/'frame-3.png');changed=sum(any(abs(on[i+c]-pic[i+c])>10 for c in range(3)) for i in range(0,len(pic),3))
 row={'path':str(p),'variant':r['variant'],'software':r['software'],'mode':r['expected'],'family':r['family'],'fixture':fixture,'oracleMAE':error,'wrongPictureMAE':negative,'subtitleChangedPixels':changed,'passed':error<=6 and negative>6 and (changed>50 or fixture=='user')}
 # Exact candidate-to-baseline is an additional differential check, not the oracle.
 matches=[]
 for q in out.glob('correctness-*/result.json'):
  z=json.loads(q.read_text())
  if z['passed'] and z['fixture']==fixture and z['family']==r['family'] and z['expected']==r['expected'] and z['variant']=='baseline' and ((r['expected']=='hybrid' and z['variant']=='baseline') or (r['expected']=='software' and z['software']=='software-baseline')):matches.append(q)
 if matches:
  comparison=mae(pic,rgb(sorted(matches)[-1].parent/'frame-3-no-sub.png'));row['baselineMAE']=comparison;row['passed'] &= comparison<=2
 rows.append(row)
result={'checks':rows,'allPassed':all(x['passed'] for x in rows),'scope':'Final 3s full-frame subtitle-off RGB, negative control, subtitle visibility and baseline equivalence; lifecycle gates in individual trials.'};(out/'pictures.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
