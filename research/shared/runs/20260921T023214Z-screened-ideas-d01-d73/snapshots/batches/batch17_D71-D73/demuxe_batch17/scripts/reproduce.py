# SPDX-License-Identifier: MIT
"""Run from a fresh copy of this package; requirements are in README.md."""
from pathlib import Path
import subprocess,sys
root=Path(__file__).resolve().parents[1]
jobs=[['build.py'],['build_geometry.py'],['run_browser.py','reverse','mse'],['run_browser.py','reverse','direct'],
 ['run_browser.py','duration','mse','explicit,no_durations,default_short'],
 ['run_browser.py','duration','mse','last_explicit,explicit_with_default,no_durations_forced_end,no_durations_forced_after_end'],
 ['run_browser.py','duration','direct'],['run_browser.py','geometry','mse'],['run_browser.py','geometry','direct'],['verify.py']]
for args in jobs:
 print('RUN',*args,flush=True)
 subprocess.run([sys.executable,str(root/'scripts'/args[0]),*args[1:]],check=True,timeout=180)
print('All jobs completed. See evidence/verification.json.')
