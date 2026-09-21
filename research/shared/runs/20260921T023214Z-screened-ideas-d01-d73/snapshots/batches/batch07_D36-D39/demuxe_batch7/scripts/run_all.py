"""SPDX-License-Identifier: MIT. Re-run all standalone screens; overwrites local evidence."""
from pathlib import Path
import subprocess,sys
S=Path(__file__).resolve().parent
steps=[['env_probe.py'],['edited_view.py'],['ordered_build.py'],['avif_route.py'],['avif_rgb_followup.py'],['run_browser.py','views'],['run_browser.py','ordered'],['run_browser.py','avif'],['run_browser.py','avif_rgb'],['analyze_verify.py']]
for step in steps:
 print('Running',*step,flush=True)
 subprocess.run([sys.executable,str(S/step[0]),*step[1:]],check=True,timeout=180)
