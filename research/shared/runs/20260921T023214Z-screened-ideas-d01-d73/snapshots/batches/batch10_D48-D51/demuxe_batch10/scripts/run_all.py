# SPDX-License-Identifier: MIT
"""Replay in a NEW directory to preserve the supplied evidence."""
from pathlib import Path
import argparse, shutil, subprocess, sys
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args()
out=args.output.resolve()
if out.exists():p.error('output directory already exists; choose a new directory')
out.mkdir(parents=True);shutil.copytree(Path(__file__).resolve().parent,out/'scripts',ignore=shutil.ignore_patterns('__pycache__'))
for name in ['build.py','run_audio.py','mp3_followup.py','run_clock.py','run_crop.py','run_rebase.py','analyze.py']:
 print('RUN',name,flush=True)
 subprocess.run([sys.executable,str(out/'scripts'/name)],cwd=out,check=True)
print('New evidence:',out/'evidence')
