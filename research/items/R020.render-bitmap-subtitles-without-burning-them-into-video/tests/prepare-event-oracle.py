# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,ast,sys
out=Path(sys.argv[1]);source=Path('results/top100/pgs');tree=ast.parse((source/'probe.py').read_text());fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='decode');env={};exec(compile(ast.Module(body=[fn],type_ignores=[]),'retained-pgs-decoder','exec'),env);data=(source/'caption.sup').read_bytes();events=env['decode'](data);bad=False
try:env['decode'](data[:-1])
except ValueError:bad=True
assert bad
cmd=['ffprobe','-v','error','-select_streams','s','-show_frames','-of','json',str(source/'caption.sup')];decoded=json.loads(subprocess.check_output(cmd));(out/'independent-subtitle-events.json').write_text(json.dumps(decoded,indent=2)+'\n');assert [(x['pts'],x['num_rects']) for x in decoded['frames']]==[(500000,1),(1500000,0)]
raw=(source/'reference.rgb').read_bytes();size=160*96*3;states={'clear':list(raw[:size]),'display':list(raw[size*2:size*3])};assert set(states['clear'])=={0} and sum(states['display'])==16*8*3*255
ours=[]
for pts,placement,bitmap,colors in events:
 rgba=[]
 if placement:
  for row in bitmap:
   for index in row:rgba.extend(colors[index])
 ours.append({'timestamp':pts/90000,'position':placement,'width':16 if placement else 0,'height':8 if placement else 0,'rgba':rgba})
(out/'input.json').write_text(json.dumps({'events':ours,'referenceEvents':decoded['frames'],'states':states,'truncatedRejected':bad})+'\n');(out/'decoder-extract.py').write_text('# SPDX-License-Identifier: Apache-2.0\n'+ast.unparse(fn)+'\n')
cmd2=['ffmpeg','-v','error','-y','-f','lavfi','-i','color=black:s=160x96:r=4:d=2','-c:v','libx264','-pix_fmt','yuv420p',str(out/'black.mp4')];subprocess.run(cmd2,check=True);(out/'commands.log').write_text(' '.join(cmd)+'\n'+' '.join(cmd2)+'\n');print('Independent decoded subtitle timestamps and off-boundary bitmap state references prepared')
