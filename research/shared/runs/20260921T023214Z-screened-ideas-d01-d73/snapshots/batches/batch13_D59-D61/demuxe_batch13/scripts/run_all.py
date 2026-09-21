# SPDX-License-Identifier: MIT
"""Run in a fresh evidence directory: python scripts/run_all.py --out /tmp/demuxe-b13-new"""
from pathlib import Path
import argparse,shutil,subprocess,sys,json,platform
p=argparse.ArgumentParser();p.add_argument('--out',required=True);a=p.parse_args();src=Path(__file__).resolve().parents[1];out=Path(a.out).resolve()
if out.exists():raise SystemExit('Refusing to overwrite an existing output directory. Choose a new --out path.')
(out/'fixtures').mkdir(parents=True);(out/'evidence').mkdir();shutil.copytree(src/'scripts',out/'scripts',ignore=shutil.ignore_patterns('__pycache__'))
from PIL import Image,features
import numpy
E=out/'evidence'
env={'python':sys.version,'platform':platform.platform(),'pillow':Image.__version__,'libtiff':features.version('libtiff'),'numpy':numpy.__version__}
for exe,args in [('ffmpeg',['-version']),('chromium',['--version'])]:env[exe]=subprocess.run([exe,*args],capture_output=True,text=True,timeout=10).stdout.splitlines()[0]
(E/'environment.json').write_text(json.dumps(env,indent=2))
steps=[['build_tiff.py'],['build_video.py'],*([ 'run_browser.py',x] for x in ['tiff','tiff_region','video','loop','loop_followup']),['verify.py']]
for cmd in steps:
 print('RUN',' '.join(cmd),flush=True)
 r=subprocess.run([sys.executable,str(out/'scripts'/cmd[0]),*cmd[1:]],capture_output=True,text=True,timeout=120)
 (E/('_'.join(cmd).replace('.py','')+'_stdout.txt')).write_text(r.stdout+r.stderr)
 if r.returncode:raise SystemExit('Step failed: '+' '.join(cmd)+'; inspect evidence log')
print('Complete:',out,flush=True)
