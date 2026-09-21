# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,os,json
base=Path('research/items/granular-engine-loading');out=Path((base/'full-run.txt').read_text().strip());records=[]
# Five alternating pairs Chrome; three Firefox. Sequential browser ownership.
for browser,pairs in [('chrome',5),('firefox',3)]:
 for network in ['local','10mbps']:
  for pair in range(pairs):
   for candidate in ([False,True] if pair%2==0 else [True,False]):
    env={**os.environ,'STAGE':'performance','BROWSER':browser,'NETWORK':network,'FIXTURE':'user','VARIANT':('lean' if candidate else 'baseline') if browser=='chrome' else 'lean','SOFTWARE':('software-common-v2' if candidate else 'software-baseline') if browser=='firefox' else 'original'}
    p=subprocess.run(['node',str(base/'tests/full/browser.mjs')],env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    rec={'browser':browser,'network':network,'pair':pair,'candidate':candidate,'exit':p.returncode,'output':p.stdout};records.append(rec);(out/'performance-order.json').write_text(json.dumps(records,indent=2));print(json.dumps(rec),flush=True)
    if p.returncode:raise SystemExit('Trial failed; remaining timing matrix stopped for diagnosis.')
