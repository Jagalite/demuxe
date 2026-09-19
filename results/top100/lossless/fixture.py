# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib
r=Path(__file__).parent
p=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json','results/top100/audio/alac.m4a']))
def parse(s):return bytes.fromhex(''.join(line.split(': ',1)[1].split('  ')[0].replace(' ','') for line in s.splitlines() if ': ' in line))
extra=parse(p['streams'][0]['extradata']);packets=[parse(x['data']) for x in p['packets']];raw=subprocess.check_output(['ffmpeg','-v','error','-i','results/top100/audio/alac.m4a','-f','s16le','-']);(r/'input.json').write_text(json.dumps({'extra':list(extra),'packets':[list(x) for x in packets],'oracle':list(raw),'sha256':hashlib.sha256(raw).hexdigest()}))
