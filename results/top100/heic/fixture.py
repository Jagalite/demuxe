# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib
r=Path(__file__).parent;g=json.load(open(r/'groups.json'));grid=g['stream_groups'][0]['components'][0];assert grid['nb_tiles']==4
p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(r/'grid.heic')]))
def parse(s):return bytes.fromhex(''.join(line.split(': ',1)[1].split('  ')[0].replace(' ','') for line in s.splitlines() if ': ' in line))
tiles=[]
for i,s in enumerate(p['streams']):
 extra=parse(s['extradata']);profile=extra[1]&31;compat=int.from_bytes(extra[2:6],'big');compat=int(f'{compat:032b}'[::-1],2);constraintBytes=list(extra[6:12]);
 while constraintBytes and constraintBytes[-1]==0:constraintBytes.pop()
 constraints='.'.join(f'{x:02X}' for x in constraintBytes);codec=f'hvc1.{profile}.{compat:X}.L{extra[12]}'+('.'+constraints if constraints else '')
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(r/'grid.heic'),'-map',f'0:{i}','-pix_fmt','yuvj420p','-f','rawvideo','-']);assert len(raw)==512*512*3//2
 packet=next(x for x in p['packets'] if x['stream_index']==i)
 tiles.append({'index':i,'description':list(extra),'codec':codec,'bytes':list(parse(packet['data'])),'oracle':list(raw),'oracleSHA256':hashlib.sha256(raw).hexdigest(),'x':grid['subcomponents'][i]['tile_horizontal_offset'],'y':grid['subcomponents'][i]['tile_vertical_offset']})
(r/'input.json').write_text(json.dumps({'tiles':tiles,'grid':grid,'scope':'Genuine ImageIO-authored2x2 HEIC grid, item graph exposed by host demux, per-tile independent host decoded YUV oracle.','sourceSHA256':hashlib.sha256((r/'grid.heic').read_bytes()).hexdigest()}))
print([x['codec'] for x in tiles])
