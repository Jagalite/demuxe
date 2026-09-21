# SPDX-License-Identifier: Apache-2.0
from run_guard import resolve_run, require_writable_run
import subprocess,os,json
from pathlib import Path
base=Path('research/items/unified-hybrid-software-engine');out=resolve_run(base);rows=[]
require_writable_run(out)
for browser,mode,fixture in [('chrome','hybrid','user'),('chrome','software','h264'),('chrome','software','user'),('firefox','software','h264'),('firefox','software','user')]:
 for variant in ['baseline','unified']:
  env={**os.environ,'VARIANT':variant,'BROWSER':browser,'FIXTURE':fixture,'EXPECT':mode,'FORCE':mode if mode=='software' else ''};p=subprocess.run(['node',str(base/'tests/browser.mjs')],env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT);row={'browser':browser,'mode':mode,'fixture':fixture,'variant':variant,'exit':p.returncode,'output':p.stdout};rows.append(row);(out/'correctness-order-v2.json').write_text(json.dumps(rows,indent=2));print(json.dumps(row),flush=True)
  if p.returncode:raise SystemExit(p.returncode)
