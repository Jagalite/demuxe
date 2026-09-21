"""Reproduce the bounded batch. Needs system FFmpeg/libopus/libjxl/Chromium and Python deps.
This runner installs nothing and accesses no external services.
"""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
steps=[['probe_audio.py'],['opus_group.py'],['au_wrap.py'],['edit_view.py'],['jxl_bridge.py'],*([['run_browser.py',stage] for stage in ['decode','images','opuslife','aulife','editlife','schedule']]),['verify.py']]
with (root/'evidence'/'reproduction_console.log').open('w') as log:
 for step in steps:
  command=[sys.executable,str(root/'scripts'/step[0]),*step[1:]]
  print('Running',*step,flush=True)
  p=subprocess.run(command,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=120)
  log.write('\n$ '+' '.join(command)+'\n'+p.stdout);log.flush()
  if p.returncode:
   print(p.stdout);raise SystemExit(p.returncode)
print('Evidence and verification updated. Report describes the original observed run; review any new differences.')
