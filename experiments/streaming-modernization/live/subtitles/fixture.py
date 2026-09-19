#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""DASH two-period fixture with aligned fragmented mov_text subtitles."""
import argparse,hashlib,json,shutil,struct,subprocess,xml.etree.ElementTree as ET
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for name in ['fixtures','manifest','output']:p.add_argument('--'+name,type=Path,required=True)
a=p.parse_args();a.output.mkdir();inputs={}
ns='{urn:mpeg:dash:schema:mpd:2011}';ET.register_namespace('',ns[1:-1])
source=a.manifest;root=ET.fromstring(source.read_bytes());inputs[str(source)]=hashlib.sha256(source.read_bytes()).hexdigest()
(a.output/'cues.srt').write_text(''.join(f'{i+1}\n00:00:{i*2:02d},000 --> 00:00:{i*2+2:02d},000\nDASH cue {i}\n\n' for i in range(8)))
cmd=['ffmpeg','-hide_banner','-loglevel','error','-i',str(a.output/'cues.srt'),'-c:s','mov_text','-movflags','+empty_moov+default_base_moof','-frag_duration','2000000',str(a.output/'cues.mp4')]
subprocess.run(cmd,check=True)
b=(a.output/'cues.mp4').read_bytes();offset=0;init=bytearray();fragments=[];part=None
while offset<len(b):
 size,kind=struct.unpack_from('>I4s',b,offset);assert size>=8 and offset+size<=len(b)
 box=b[offset:offset+size]
 if kind in [b'ftyp',b'moov']:init+=box
 elif kind==b'moof':part=bytearray(box)
 elif kind==b'mdat':assert part is not None;part+=box;fragments.append(bytes(part));part=None
 offset+=size
assert len(fragments)==9 # terminal empty sample excluded from the 16-second timeline
(a.output/'init-subtitle.m4s').write_bytes(init)
for i,data in enumerate(fragments[:8]):(a.output/f'subtitle-{i+1:05d}.m4s').write_bytes(data)
for period in root.findall(ns+'Period'):
 adaptation=ET.SubElement(period,ns+'AdaptationSet',id='subtitle',contentType='text',lang='en',segmentAlignment='true')
 rep=ET.SubElement(adaptation,ns+'Representation',id='subtitle',mimeType='application/mp4',codecs='tx3g',bandwidth='1000')
 template=ET.SubElement(rep,ns+'SegmentTemplate',timescale='1000000',initialization='init-subtitle.m4s',media='subtitle-$Number%05d$.m4s',startNumber='1')
 timeline=ET.SubElement(template,ns+'SegmentTimeline');ET.SubElement(timeline,ns+'S',t='0',d='2000000',r='7')
(a.output/'manifest.mpd').write_bytes(ET.tostring(root,encoding='utf-8',xml_declaration=True))
for group in range(5):
 for name in [f'init-stream{group}.m4s']+[f'chunk-stream{group}-{i:05d}.m4s' for i in range(1,9)]:
  source=a.fixtures/'dash'/name;shutil.copy2(source,a.output/name);inputs[str(source)]=hashlib.sha256(source.read_bytes()).hexdigest()
files={str(f.relative_to(a.output)):{'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}for f in a.output.rglob('*')if f.is_file()}
(a.output/'fixture-manifest.json').write_text(json.dumps({'scope':__doc__,'inputs':inputs,'generatorSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'command':cmd,'ffmpeg':subprocess.check_output(['ffmpeg','-version'],text=True),'files':files},indent=2)+'\n')
