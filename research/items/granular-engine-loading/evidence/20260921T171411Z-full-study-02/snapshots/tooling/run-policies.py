# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,os,json
base=Path('research/items/granular-engine-loading');out=Path((base/'full-run.txt').read_text().strip());records=[]
cases=[]
for browser in ['chrome','firefox']:
 for policy in ['none','selective','all']:
  cases.append({'STAGE':'policy','BROWSER':browser,'PREPARE':policy,'NETWORK':'10mbps','VARIANT':'lean','SOFTWARE':'original' if browser=='chrome' else 'software-common-v2'})
 for network in ['local','10mbps']:cases.append({'STAGE':'cache','BROWSER':browser,'CACHE':'warm','NETWORK':network,'VARIANT':'lean','SOFTWARE':'original' if browser=='chrome' else 'software-common-v2'})
for policy in ['none','selective','all']:cases.append({'STAGE':'recovery','PREPARE':policy,'NETWORK':'10mbps','VARIANT':'lean','SOFTWARE':'original','BROWSER':'chrome'})
cases.append({'STAGE':'policy','PREPARE':'all','NETWORK':'local','VARIANT':'lean','SOFTWARE':'original','BROWSER':'chrome','FAULT':'software-unavailable'})
for case in cases:
 p=subprocess.run(['node',str(base/'tests/full/browser.mjs')],env={**os.environ,**case,'FIXTURE':'user'},stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 record={'env':case,'exit':p.returncode,'output':p.stdout};records.append(record);(out/'policy-order.json').write_text(json.dumps(records,indent=2));print(json.dumps(record),flush=True)
 if p.returncode:raise SystemExit('Policy trial failed; stopping for diagnosis.')
