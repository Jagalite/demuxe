# SPDX-License-Identifier: MIT
"""Replay into a NEW directory. Requires Chromium, FFmpeg, numpy and playwright.
Uses installed dependencies only. Does not modify any repository or source archive."""
from pathlib import Path
import argparse,shutil,subprocess,sys,json

def main():
 p=argparse.ArgumentParser();p.add_argument('--out',required=True,type=Path);a=p.parse_args()
 if a.out.exists():raise SystemExit('Output directory must not exist; use a fresh path.')
 (a.out/'evidence').mkdir(parents=True);(a.out/'fixtures').mkdir();shutil.copytree(Path(__file__).resolve().parent,a.out/'scripts',ignore=shutil.ignore_patterns('__pycache__'))
 jobs=[['build.py'],['build_split.py'],['build_alternate.py'],['browser_av.py'],['browser_av.py','--split'],['browser_ledger.py'],['browser_ledger_v0.py','--only','overwrite_v0'],['browser_ledger_v0.py','--only','pending_aba_v0'],['verify.py']]
 results=[]
 for i,job in enumerate(jobs):
  print('RUN',i+1,job,flush=True)
  with (a.out/'evidence'/f'replay_step_{i+1:02}.log').open('w') as out:
   try:r=subprocess.run([sys.executable,str(a.out/'scripts'/job[0]),*job[1:]],stdout=out,stderr=subprocess.STDOUT,timeout=150)
   except subprocess.TimeoutExpired:results.append({'step':job,'timeout':True});(a.out/'evidence'/'replay_jobs.json').write_text(json.dumps(results,indent=2));raise
  results.append({'step':job,'returncode':r.returncode});(a.out/'evidence'/'replay_jobs.json').write_text(json.dumps(results,indent=2))
  if r.returncode:raise SystemExit(r.returncode)
 print('All replay stages completed',flush=True)
if __name__=='__main__':main()
