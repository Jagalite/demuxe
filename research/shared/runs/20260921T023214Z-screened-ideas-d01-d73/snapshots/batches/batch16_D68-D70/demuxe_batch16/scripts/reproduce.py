# SPDX-License-Identifier: MIT
"""Run the component screens in a fresh output directory; do not overwrite evidence."""
import argparse, os, subprocess, sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('output',type=Path);a=p.parse_args()
root=a.output.resolve()
if root.exists() and any(root.iterdir()):p.error('output directory must be new or empty')
(root/'evidence').mkdir(parents=True,exist_ok=True)
env=dict(os.environ,DEMUXE_BATCH_DIR=str(root));scripts=Path(__file__).parent
for step in ['build_caf.py','build_karaoke.py','run_caf.py','run_karaoke.py','verify.py']:
 print(step,flush=True)
 with (root/'evidence'/(step+'.log')).open('w') as log:
  subprocess.run([sys.executable,str(scripts/step)],env=env,stdout=log,stderr=subprocess.STDOUT,check=True,timeout=180)
print(root/'evidence'/'verification.json')
