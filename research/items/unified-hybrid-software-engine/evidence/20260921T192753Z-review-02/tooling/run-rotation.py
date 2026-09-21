# SPDX-License-Identifier: Apache-2.0
from run_guard import resolve_run, require_writable_run
import subprocess,os,json
from pathlib import Path
base=Path('research/items/unified-hybrid-software-engine');out=resolve_run(base);rows=[]
require_writable_run(out)
for browser,mode in [('chrome','hybrid'),('chrome','software'),('firefox','software')]:
 for variant in ['baseline','unified']:
  env={**os.environ,'VARIANT':variant,'BROWSER':browser,'FIXTURE':'rotation90','EXPECT':mode,'FORCE':mode};p=subprocess.run(['node',str(base/'tests/browser.mjs')],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);row={'browser':browser,'mode':mode,'variant':variant,'exit':p.returncode,'output':p.stdout};rows.append(row);(out/'rotation90-order.json').write_text(json.dumps(rows,indent=2));print(json.dumps(row),flush=True)
  if p.returncode:raise SystemExit(p.returncode)
