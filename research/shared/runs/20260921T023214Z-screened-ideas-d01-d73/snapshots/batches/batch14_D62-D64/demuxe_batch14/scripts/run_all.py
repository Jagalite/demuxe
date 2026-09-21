# SPDX-License-Identifier: MIT
from common import *
import sys,platform,importlib.metadata
stages=[['build_audio.py'],['build_pgs.py'],['run_audio.py','first'],['run_audio.py','rest'],['run_audio.py','join'],['run_audio.py','live'],['run_audio.py','controls'],['run_pgs.py'],['verify.py']]
# Deterministic generated video background, not a downloaded asset.
ff('-f','lavfi','-i','testsrc2=size=128x64:rate=25:duration=3','-an','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-g','25','-bf','0','-movflags','+faststart',F/'background.mp4')
save('environment.json',{'platform':platform.platform(),'python':platform.python_version(),'numpy':importlib.metadata.version('numpy'),'pillow':importlib.metadata.version('Pillow'),'playwright':importlib.metadata.version('playwright'),'ffmpeg':run(['ffmpeg','-version']).decode().splitlines()[0],'chromium':run(['chromium','--version']).decode().strip(),'repo_lineage_commit':'6feb9b337889bfbaab8c5ac33bbddd0ca5d94f36','maintained_player_executed':False,'hardware_acceleration_qualified':False,'method':'Headless Chromium, about:blank page, data supplied through Playwright fixture bridge; Blob media, real-time AudioContext capture, same-browser image comparison'})
for a in stages:
 print('RUN',*a,flush=True);o=run([sys.executable,R/'scripts'/a[0],*a[1:]],timeout=35);(E/('stdout_'+'_'.join(a)+'.txt')).write_bytes(o);print(o.decode()[-200:],flush=True)
