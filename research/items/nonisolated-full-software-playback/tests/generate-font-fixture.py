#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""A visibly distinctive licensed font makes fallback substitution observable."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
def sha(p):return hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--font',type=Path,required=True);args=p.parse_args();out=args.out.resolve();out.mkdir();folder=out/'font';folder.mkdir()
shutil.copyfile(__file__,out/'generator.py');shutil.copyfile(args.font.parent/'FONT-LICENSE.txt',folder/'FONT-LICENSE.txt')
font=TTFont(args.font)
for record in font['name'].names:
 if record.nameID in [1,2,3,4,6,16,17]:
  text='Regular' if record.nameID in [2,17] else 'DemuxeQualification' if record.nameID==6 else 'Demuxe Qualification'
  record.string=text.encode(record.getEncoding())
pen=TTGlyphPen(None);pen.moveTo((0,0));pen.lineTo((1300,0));pen.lineTo((1300,1500));pen.lineTo((0,1500));pen.closePath()
font['glyf']['A']=pen.glyph();font['hmtx']['A']=(1800,0);font.save(folder/'DemuxeQualification.ttf')
ffmpeg=Path(shutil.which('ffmpeg')).resolve();fixture=folder/'fixture.mp4'
command=[str(ffmpeg),'-hide_banner','-loglevel','error','-f','lavfi','-i','color=black:size=320x180:rate=30:duration=6','-f','lavfi','-i','sine=frequency=997:sample_rate=48000:duration=6','-c:v','libx264','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-ac','2','-shortest',str(fixture)]
subprocess.run(command,check=True)
record={'scope':'Custom font glyph oracle: A is a solid rectangle, not a fallback triangle','fontInput':str(args.font),'fontInputSHA256':sha(args.font),'ffmpegSHA256':sha(ffmpeg),'commands':[command],'rows':[{'profile':{'key':'font','fixture':str(fixture),'width':320,'height':180,'fps':30,'duration':6},'files':{f.name:{'sha256':sha(f),'bytes':f.stat().st_size} for f in folder.iterdir()}}]}
(out/'references.json').write_text(json.dumps(record,indent=2)+'\n')
