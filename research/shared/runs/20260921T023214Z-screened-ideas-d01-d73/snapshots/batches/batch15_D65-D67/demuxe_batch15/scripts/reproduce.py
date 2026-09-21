# SPDX-License-Identifier: MIT
"""Run the bounded screens in this package; Chromium and FFmpeg are required."""
from common import *
import sys
steps=[('build_ogg.py',[]),('build_video.py',[]),('build_webp.py',[]),('run_browser.py',['ogg']),('run_browser.py',['video1']),('run_browser.py',['video2']),('run_webp.py',[]),('run_followup.py',[]),('analyze.py',[])]
start=int(sys.argv[1]) if len(sys.argv)>1 else 0
stop=int(sys.argv[2]) if len(sys.argv)>2 else len(steps)
for i,(n,args) in enumerate(steps[start:stop],start):
 print('RUN',i,n,*args,flush=True)
 with (E/f'replay_step{i}.log').open('w') as log:
  p=subprocess.run([sys.executable,str(R/'scripts'/n),*args],stdout=log,stderr=subprocess.STDOUT,timeout=60)
 if p.returncode:raise SystemExit(f'{n} failed; see evidence/replay_step{i}.log')
 print('OK',i,flush=True)
