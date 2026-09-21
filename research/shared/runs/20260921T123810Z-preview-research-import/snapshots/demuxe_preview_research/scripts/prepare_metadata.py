# SPDX-License-Identifier: Apache-2.0
"""Prepare metadata for the INCLUDED SYNTHETIC fixtures, not arbitrary MP4/JPEG.
The small avcC locator and JPEG scan walker are fixture tooling, not production
parsers. A production provider must reuse Demuxe's validated demux/index layer.
"""
import pathlib,json,subprocess
R=pathlib.Path(__file__).resolve().parents[1]; F=R/'fixtures'
p=F/'h264.mp4'; data=p.read_bytes(); i=data.index(b'avcC'); n=int.from_bytes(data[i-4:i],'big'); avcc=data[i+4:i-4+n]
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_entries','packet=pts_time,dts_time,pos,size,flags','-of','json',str(p)]))
meta={'codec':'avc1.'+avcc[1:4].hex(),'description':list(avcc),'width':1920,'height':1080,'packets':meta['packets']}
(F/'h264_packets.json').write_text(json.dumps(meta))
# Progressive JPEG: provide the first completed scan plus the following marker/header.
def jpeg_scan_ends(data):
 i=2; scans=[]
 while i<len(data)-1:
  if data[i]!=255:i+=1;continue
  while i<len(data) and data[i]==255:i+=1
  m=data[i];i+=1
  if m in [0,0xd8,0xd9] or 0xd0<=m<=0xd7:continue
  length=int.from_bytes(data[i:i+2],'big')
  if m==0xda:scans.append({'marker':i-2,'header_end':i+length})
  i+=length
 return scans
prog={}
for name in ['chart4k','texture4k']:
 b=(F/f'{name}_progressive.jpg').read_bytes(); scans=jpeg_scan_ends(b)
 prog[name]={'bytes':len(b),'scan_headers':scans,'prefix_bytes':scans[1]['header_end'] if len(scans)>1 else len(b)}
(F/'progressive_meta.json').write_text(json.dumps(prog))
print('Prepared synthetic-fixture metadata.')
