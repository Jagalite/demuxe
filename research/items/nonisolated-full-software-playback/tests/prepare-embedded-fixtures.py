#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Bind existing marked fixtures and independently decode their bitmap overlays."""
import argparse,hashlib,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--assets',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.mkdir()
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
base=a.assets/'build/head-to-head/assets-component-isolation-01/fixtures'
rows=[];commands=[]
for key,path in [('srt',base/'h264-srt/index.mkv'),('movtext',base/'h264-movtext/index.mp4'),('ass',base/'h264-ass/index.mkv'),('pgs',a.assets/'build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv'),('vobsub',a.assets/'build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv'),('multi-srt',a.assets/'build/mpv-subtitle-service/generalization/multi-srt.mkv')]:
 folder=a.out/key;folder.mkdir();probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)]));(folder/'probe.json').write_text(json.dumps(probe,indent=2)+'\n')
 if key in ['pgs','vobsub']:
  cmd=['ffmpeg','-v','error','-i',str(path),'-filter_complex','[0:v][0:s]overlay,scale=320:180:flags=bilinear','-ss','1','-frames:v','1','-an','-f','rawvideo','-pix_fmt','rgb24',str(folder/'reference.rgb')];commands.append(cmd);subprocess.run(cmd,check=True)
 rows.append({'profile':{'key':key,'fixture':str(path),'width':320,'height':180,'duration':float(probe['format']['duration']),'bitmap':key in ['pgs','vobsub'],'subtitleTracks':len([s for s in probe['streams'] if s['codec_type']=='subtitle'])},'fixtureSHA256':sha(path),'files':{f.name:sha(f) for f in folder.iterdir()}})
(a.out/'references.json').write_text(json.dumps({'scope':'Embedded subtitle fixture and independent bitmap picture references','commands':commands,'rows':rows},indent=2)+'\n')
