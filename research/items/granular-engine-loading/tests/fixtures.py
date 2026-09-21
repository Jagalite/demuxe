# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib
base=Path('research/items/granular-engine-loading');out=Path((base/'active-run.txt').read_text().strip());fixtures=out/'fixtures-v2';fixtures.mkdir(exist_ok=True)
ass=fixtures/'captions.ass';ass.write_text('''[Script Info]
ScriptType: v4.00+
PlayResX: 320
PlayResY: 180
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,8,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:09.00,Default,,0,0,0,,Research ASS overlay
''')
file=fixtures/'h264-aac-ass.mkv';commands=[]
def run(args):commands.append(args);subprocess.run(args,check=True)
run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n','-f','lavfi','-i','testsrc2=size=320x180:rate=24:duration=10','-f','lavfi','-i','sine=frequency=1000:sample_rate=48000:duration=10','-i',str(ass),'-map','0:v','-map','1:a','-map','2:s','-c:v','libx264','-preset','fast','-g','24','-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:a','aac','-ac','2','-c:s','ass','-disposition:s:0','default','-t','10',str(file)])
for sec in [1,3]:run(['ffmpeg','-hide_banner','-loglevel','error','-nostdin','-n','-i',str(file),'-ss',str(sec),'-an','-sn','-frames:v','1','-pix_fmt','rgb24','-f','rawvideo',str(fixtures/f'oracle-{sec}.rgb')])
user=Path('/Volumes/seed2/Projects/startup-repro/software_test_slow.mkv')
manifest={'commands':commands,'fixtures':[{'path':str(p.resolve()),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'license':'NOASSERTION' if p==user else 'CC-BY-4.0','provenance':'User supplied local file; reference only, not copied or published' if p==user else 'Original synthetic FFmpeg testsrc2 and sine with authored ASS'} for p in [file,ass,user]],'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True).splitlines()[0]};(out/'fixtures-v2.json').write_text(json.dumps(manifest,indent=2)+'\n')
