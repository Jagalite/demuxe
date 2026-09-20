# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,time,hashlib,sys
out=Path(sys.argv[1]);source=out/'source.webm';target=out/'split.webm';cmd=['ffmpeg','-v','error','-i',str(source),'-map','0:v','-c','copy','-cluster_time_limit','500','-cluster_size_limit','10000000',str(target)];t=time.perf_counter();subprocess.run(cmd,check=True);authorMs=(time.perf_counter()-t)*1000
rows=[]
for p in [source,target]:
 packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(p)]))['packets'];tuples=[{k:v[k] for k in ['pts','dts','duration','size','flags','data_hash']} for v in packets];frames=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','framemd5','-']).decode();(out/(p.stem+'.framemd5')).write_text(frames);rows.append({'file':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'packets':tuples,'frameLines':[v for v in frames.splitlines() if not v.startswith('#')],'clusters':p.read_bytes().count(bytes.fromhex('1f43b675'))})
assert rows[0]['packets']==rows[1]['packets'];assert rows[0]['frameLines']==rows[1]['frameLines'];assert rows[0]['clusters']==1;assert rows[1]['clusters']>1
(out/'host-result.json').write_text(json.dumps({'rows':rows,'authorMs':authorMs,'command':cmd,'allPacketsAndDecodedFramesExact':True,'keyframes':sum('K' in p['flags'] for p in rows[0]['packets'])},indent=2))
