#!/usr/bin/env python3
"""Repeat encoded HLS timestamps across two explicit discontinuity epochs."""
import argparse,hashlib,json,shutil
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--fixtures',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args();a.fixtures=a.fixtures.resolve();a.output=a.output.resolve();a.output.mkdir()
media={};media['master.m3u8']=(a.fixtures/'master.m3u8').read_bytes()
for name in ['low','medium','high','english','alternate']:
 lines=(a.fixtures/name/'media.m3u8').read_text().splitlines();parts=[]
 for i,line in enumerate(lines):
  if line.startswith('#EXTINF:'):parts.append((float(line.split(':')[1].rstrip(',')),lines[i+1]))
 parts=parts[:8];assert len(parts)==8
 parts[-1]=(16-sum(d for d,_ in parts[:-1]),parts[-1][1]);assert parts[-1][0]>0
 playlist=['#EXTM3U','#EXT-X-VERSION:7','#EXT-X-TARGETDURATION:3','#EXT-X-MEDIA-SEQUENCE:0','#EXT-X-DISCONTINUITY-SEQUENCE:0']
 for epoch in range(2):
  if epoch:playlist.append('#EXT-X-DISCONTINUITY')
  playlist.append(f'#EXT-X-MAP:URI="../epoch{epoch}/{name}/init.mp4"')
  for duration,file in parts:playlist += [f'#EXTINF:{duration:.6f},',f'../epoch{epoch}/{name}/{file}']
 playlist.append('#EXT-X-ENDLIST');media[name+'/media.m3u8']=('\n'.join(playlist)+'\n').encode()
playlist=['#EXTM3U','#EXT-X-TARGETDURATION:2','#EXT-X-DISCONTINUITY-SEQUENCE:0']
for epoch in range(2):
 if epoch:playlist.append('#EXT-X-DISCONTINUITY')
 for index in range(8):
  name=f'epoch{epoch}/cue-{index}.vtt';playlist += ['#EXTINF:2,',name]
  media[name]=(f'WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:02.000,MPEGTS:0\n\n{epoch}-{index}\n00:00:{index*2+2.25:06.3f} --> 00:00:{index*2+3.75:06.3f}\nEpoch {epoch} cue {index}\n').encode()
playlist.append('#EXT-X-ENDLIST');media['captions.m3u8']=('\n'.join(playlist)+'\n').encode()
for name,data in media.items():f=a.output/name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(data)

inputs={}
for epoch in range(2):
 for group in ['low','medium','high','english','alternate']:
  destination=a.output/f'epoch{epoch}'/group;destination.mkdir(parents=True)
  for name in ['init.mp4']+[f'{i:03d}.m4s' for i in range(8)]:
   source=a.fixtures/group/name;shutil.copy2(source,destination/name)
   inputs[str(source)]=hashlib.sha256(source.read_bytes()).hexdigest()
for source in [a.fixtures/'master.m3u8',*[a.fixtures/g/'media.m3u8' for g in ['low','medium','high','english','alternate']]]:
 inputs[str(source)]=hashlib.sha256(source.read_bytes()).hexdigest()
files={str(f.relative_to(a.output)):{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}for f in a.output.rglob('*')if f.is_file()}
(a.output/'fixture-manifest.json').write_text(json.dumps({'scope':__doc__,'inputs':inputs,'generatorSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'files':files},indent=2)+'\n')
