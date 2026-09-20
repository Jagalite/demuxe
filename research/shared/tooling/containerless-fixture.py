# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,sys
r=Path(sys.argv[1]);x=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(r/'source.webm')]))
def data(s):return bytes.fromhex(''.join(line.split(':',1)[1].strip().split('  ')[0].replace(' ','') for line in s.splitlines() if ':' in line))
streams=[]
for s in x['streams']:
 kind=s['codec_type'];config={'codec':'vp09.00.10.08','codedWidth':s['width'],'codedHeight':s['height'],'description':[]} if kind=='video' else {'codec':'opus','sampleRate':48000,'numberOfChannels':s['channels'],'description':list(data(s['extradata']))}
 packets=[{'timestamp':round(float(p['pts_time'])*1e6),'duration':round(float(p['duration_time'])*1e6),'type':'key' if 'K' in p['flags'] or kind=='audio' else 'delta','data':list(data(p['data'])),'sideData':p.get('side_data_list')} for p in x['packets'] if p['stream_index']==s['index']];streams.append({'kind':kind,'config':config,'packets':packets})
(r/'input.json').write_text(json.dumps(streams)+'\n');(r/'probe.json').write_text(json.dumps(x,indent=2)+'\n')
