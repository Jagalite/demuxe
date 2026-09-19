#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Group existing encoded fragments into 12-second HLS resources for incremental-delivery tests."""
import argparse,hashlib,json,shutil
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixtures',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output.mkdir();inputs={}
for group in ['low','medium','high','english','alternate']:
 out=a.output/group;out.mkdir();source=a.fixtures/group
 shutil.copy2(source/'init.mp4',out/'init.mp4');inputs[str(source/'init.mp4')]=hashlib.sha256((source/'init.mp4').read_bytes()).hexdigest()
 for index in range(2):
  with (out/f'{index:03d}.m4s').open('wb')as f:
   for n in range(index*6,(index+1)*6):
    part=source/f'{n:03d}.m4s';data=part.read_bytes();inputs[str(part)]=hashlib.sha256(data).hexdigest();f.write(data)
 durations=[float(line.split(':')[1].rstrip(',')) for line in (source/'media.m3u8').read_text().splitlines() if line.startswith('#EXTINF:')]
 inputs[str(source/'media.m3u8')]=hashlib.sha256((source/'media.m3u8').read_bytes()).hexdigest()
 (out/'media.m3u8').write_text('#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-TARGETDURATION:13\n#EXT-X-MAP:URI="init.mp4"\n'+''.join(f'#EXTINF:{sum(durations[i*6:(i+1)*6]):.6f},\n{i:03d}.m4s\n' for i in range(2))+'#EXT-X-ENDLIST\n')
for name in ['master.m3u8','captions.m3u8','captions.vtt']:
 source=a.fixtures/name;shutil.copy2(source,a.output/name);inputs[str(source)]=hashlib.sha256(source.read_bytes()).hexdigest()
(a.output/'captions.m3u8').write_text('#EXTM3U\n#EXT-X-TARGETDURATION:24\n#EXTINF:24,\ncaptions.vtt\n#EXT-X-ENDLIST\n')
(a.output/'captions.vtt').write_text('WEBVTT\n\n00:00:00.000 --> 00:00:24.000\nIncremental delivery fixture\n')
files={str(f.relative_to(a.output)):{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}for f in a.output.rglob('*')if f.is_file()}
(a.output/'fixture-manifest.json').write_text(json.dumps({'scope':__doc__,'source':str(a.fixtures),'inputs':inputs,'generatorSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'files':files,'note':'HTTP harness appends a valid 9 MiB free box. This stresses resource delivery size, not high-bitrate decoding.'},indent=2)+'\n')
