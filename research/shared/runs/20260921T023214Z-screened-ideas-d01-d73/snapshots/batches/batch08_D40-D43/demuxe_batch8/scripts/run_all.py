"""SPDX-License-Identifier: MIT. Recreates the current bounded screen, without repository writes."""
from pathlib import Path
import subprocess,sys
D=Path(__file__).resolve().parent
for script in ['multistream.py','lacing.py','chain.py','resample_build.py']:
 subprocess.run([sys.executable,str(D/script)],check=True)
for stage in ['multi','multilife','lacing','lacinglife','lacingdirect','chain','chainlife','resample','resample_followup']:
 subprocess.run([sys.executable,str(D/'run_browser.py'),stage],check=True)
subprocess.run([sys.executable,str(D/'verify.py')],check=True)
