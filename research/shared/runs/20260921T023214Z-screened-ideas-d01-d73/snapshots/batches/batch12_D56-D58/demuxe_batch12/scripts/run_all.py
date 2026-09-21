# SPDX-License-Identifier: MIT
"""Replay into a copied/new package directory; this overwrites evidence there."""
from pathlib import Path
import subprocess,sys
S=Path(__file__).resolve().parent
for args in [('build.py',),('run_browser.py','video'),('run_browser.py','continuous'),('run_browser.py','sparse'),('run_browser.py','iir'),('verify.py',)]:
 print('RUN',*args,flush=True)
 subprocess.run([sys.executable,*[str(S/args[0]),*args[1:]]],check=True,timeout=90)
