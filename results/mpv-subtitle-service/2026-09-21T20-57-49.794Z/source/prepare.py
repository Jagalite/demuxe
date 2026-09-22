# SPDX-License-Identifier: Apache-2.0
"""Recreate the authored fixture lineage, preserving the rejected controls."""
from pathlib import Path
import subprocess,shutil,json
root=Path(__file__).resolve().parents[2];out=root/'build/mpv-subtitle-service/fixtures';out.mkdir(parents=True,exist_ok=True)
shutil.copy(Path(__file__).with_name('captions.ass'),out/'captions.ass')
base=['ffmpeg','-v','error','-y'];enc=['-c:v','libx265','-preset','ultrafast','-pix_fmt','yuv420p10le'];commands=[]
def run(args):commands.append(args);subprocess.run(args,check=True,cwd=root)
run(base+['-f','lavfi','-i','testsrc2=size=1280x720:rate=24:duration=40','-f','lavfi','-i','sine=frequency=440:duration=40','-i',str(out/'captions.ass'),'-map','0:v','-map','1:a','-map','2:s','-vf','drawbox=x=0:y=0:w=1280:h=170:color=black:t=fill,drawbox=x=0:y=600:w=1280:h=120:color=black:t=fill']+enc+['-x265-params','pools=2:frame-threads=2:log-level=error','-c:a','aac','-c:s','copy','-attach','fixtures/DejaVuSans.ttf','-metadata:s:t','mimetype=application/x-truetype-font',str(out/'rejected-bframes.mkv')])
run(base+['-i',str(out/'rejected-bframes.mkv'),'-map','0','-c','copy']+enc+['-x265-params','pools=2:frame-threads=2:bframes=0:log-level=error',str(out/'rejected-long-gop.mkv')])
run(base+['-i',str(out/'rejected-long-gop.mkv'),'-map','0','-c','copy']+enc+['-x265-params','pools=2:frame-threads=2:bframes=0:keyint=24:min-keyint=24:scenecut=0:log-level=error',str(out/'qualified.mkv')])
(out/'commands.json').write_text(json.dumps(commands,indent=2))
