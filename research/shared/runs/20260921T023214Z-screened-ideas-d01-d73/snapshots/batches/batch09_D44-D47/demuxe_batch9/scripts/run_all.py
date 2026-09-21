"""Replay the bounded screens. Use a fresh package copy to retain delivered evidence."""
from pathlib import Path
import subprocess,sys
S=Path(__file__).resolve().parent
steps=[('video_build.py',),('color_followup.py',),('run_video.py','descriptions'),('run_video.py','refresh'),('run_video.py','colors'),('run_video.py','color_resolved'),('vorbis_windows.py',),('run_audio.py',),('analyze.py',)]
for step in steps:
 print('Running',*step,flush=True)
 subprocess.run([sys.executable,str(S/step[0]),*step[1:]],check=True,timeout=240)
