# SPDX-License-Identifier: MIT
"""Replay into a new directory, never replacing the provided evidence."""
from pathlib import Path
import argparse,shutil,subprocess,sys
p=argparse.ArgumentParser();p.add_argument('--output',required=True);args=p.parse_args()
out=Path(args.output).resolve();src=Path(__file__).resolve().parent
if out.exists():p.error('output directory exists; choose a fresh path')
(out/'fixtures').mkdir(parents=True);(out/'evidence').mkdir();shutil.copytree(src,out/'scripts',ignore=shutil.ignore_patterns('__pycache__'))
def run(script,*a):
    cmd=[sys.executable,str(out/'scripts'/script),*a]
    print(' '.join(cmd),flush=True)
    subprocess.run(cmd,check=True,timeout=150)
run('build.py')
for stage in ['fir','silence','evict','captions','fir_followup','fir_qualified','silence_followup','tail_minimal']:run('run_browser.py',stage)
run('verify.py')
print('Fresh results: '+str(out/'evidence'/'analysis.json'))
