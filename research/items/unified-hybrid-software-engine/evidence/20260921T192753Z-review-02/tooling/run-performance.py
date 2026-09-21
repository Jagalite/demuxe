# SPDX-License-Identifier: Apache-2.0
from run_guard import resolve_run, require_writable_run
import subprocess,os,json,time
from pathlib import Path
base=Path('research/items/unified-hybrid-software-engine');out=resolve_run(base);rows=json.loads((out/'performance-order.json').read_text()) if (out/'performance-order.json').exists() else []
require_writable_run(out)
gate=json.loads((out/'pictures.json').read_text());assert all(x['passed'] for x in gate['checks'] if 'oracleMAE' in x), 'Picture gate failed'
qualified={(x['variant'],x['family'],x['mode'],x['fixture']) for x in gate['checks'] if x['passed']}
for browser,mode in [('chrome','hybrid'),('chrome','software'),('firefox','software')]:
 for variant in ['baseline','unified']:
  assert (variant,browser,mode,'user') in qualified, 'Missing primary profile gate'
  assert (variant,browser,mode,'rotation90') in qualified, 'Missing rotation gate'
trials=[]
for browser in ['chrome','firefox']:
 for pair in range(3):
  for variant in (['baseline','unified'] if pair%2==0 else ['unified','baseline']):trials.append((browser,variant,'policy','all','10mbps',pair))
for pair in range(3):
 for variant in (['baseline','unified'] if pair%2==0 else ['unified','baseline']):trials.append(('chrome',variant,'recovery','none','10mbps',pair))
for browser in ['chrome','firefox']:
 for variant in ['baseline','unified']:trials.append((browser,variant,'performance','none','local',0))
(out/'performance-plan.json').write_text(json.dumps(trials,indent=2))
def wait_for_quiet():
 start=time.monotonic();quiet_since=None
 while time.monotonic()-start<300:
  active=[line for line in subprocess.check_output(['ps','-axo','pid=,command='],text=True).splitlines() if 'node experiments/mpv-subtitle-service/run.mjs' in line]
  if active:quiet_since=None
  elif quiet_since is None:quiet_since=time.monotonic()
  elif time.monotonic()-quiet_since>=int(os.environ.get("QUIET_SECONDS","60")):return
  print(json.dumps({'waitingForQuiet':active,'waitSeconds':round(time.monotonic()-start)}),flush=True);time.sleep(5)
 raise SystemExit('No quiet browser interval within five minutes; timing remains unqualified')
wait_for_quiet()
for browser,variant,stage,prepare,network,pair in trials:
 if any(r['exit']==0 and (r['browser'],r['variant'],r['stage'],r['prepare'],r['network'],r['pair'])==(browser,variant,stage,prepare,network,pair) for r in rows):continue
 if any('node experiments/mpv-subtitle-service/run.mjs' in line for line in subprocess.check_output(['ps','-axo','command='],text=True).splitlines()):wait_for_quiet()
 env={**os.environ,'VARIANT':variant,'BROWSER':browser,'FIXTURE':'user','EXPECT':'hybrid' if browser=='chrome' else 'software','STAGE':stage,'PREPARE':prepare,'NETWORK':network};p=subprocess.run(['node',str(base/'tests/browser.mjs')],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);row={'browser':browser,'variant':variant,'stage':stage,'prepare':prepare,'network':network,'pair':pair,'exit':p.returncode,'output':p.stdout};rows.append(row);(out/'performance-order.json').write_text(json.dumps(rows,indent=2));print(json.dumps(row),flush=True)
 if p.returncode:raise SystemExit(p.returncode)
