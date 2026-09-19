#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Make a reproducible two-period MPD that reuses the ladder's first eight fragments."""
import argparse,copy,hashlib,json,xml.etree.ElementTree as ET
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--fixtures',required=True,type=Path);p.add_argument('--output',required=True,type=Path);a=p.parse_args();a.output.mkdir()
source=a.fixtures/'dash/manifest.mpd';ns='{urn:mpeg:dash:schema:mpd:2011}';ET.register_namespace('',ns[1:-1]);root=ET.fromstring(source.read_bytes());root.set('mediaPresentationDuration','PT32S');root.attrib.pop('type',None)
original=root.find(ns+'Period');root.remove(original)
for index in range(2):
 period=copy.deepcopy(original);period.set('id','period-'+str(index));period.set('start',f'PT{index*16}S');period.set('duration','PT16S')
 for template in period.iter(ns+'SegmentTemplate'):
  template.set('startNumber','1');template.set('presentationTimeOffset','0');timeline=template.find(ns+'SegmentTimeline');entries=[];at=0
  for item in timeline:
   at=int(item.get('t',at));d=int(item.attrib['d']);repeat=int(item.get('r','0'));assert d>0 and 0<=repeat<=3600
   for _ in range(repeat+1):entries.append((at,d));at+=d
  assert len(entries)>=8;timeline.clear()
  for t,d in entries[:8]:ET.SubElement(timeline,ns+'S',t=str(t),d=str(d))
 root.append(period)
manifest=ET.tostring(root,encoding='utf-8',xml_declaration=True);(a.output/'manifest.mpd').write_bytes(manifest)
sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
(a.output/'fixture-manifest.json').write_text(json.dumps({'scope':__doc__,'input':str(source),'inputSHA256':sha(source),'generatorSHA256':sha(Path(__file__)),'manifestSHA256':sha(a.output/'manifest.mpd')},indent=2)+'\n')
