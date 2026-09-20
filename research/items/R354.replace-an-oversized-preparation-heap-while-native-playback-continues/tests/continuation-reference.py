# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib,sys
out=Path(sys.argv[1]);source=Path('research/items/R354.replace-an-oversized-preparation-heap-while-native-playback-continues/evidence/20260919T223600Z-multitrack-heap/source.mp4');data=source.read_bytes();p=0;moov=None
while p<len(data):
 n=int.from_bytes(data[p:p+4],'big');header=8
 if n==1:n=int.from_bytes(data[p+8:p+16],'big');header=16
 assert n>=header
 if data[p+4:p+8]==b'moov':moov={'start':p,'end':p+n,'headerBytes':header}
 p+=n
assert moov
j=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-read_intervals','%+12','-show_packets','-show_data_hash','sha256','-of','json',str(source)]));packets=[{k:p[k] for k in ['pts','dts','duration','size','pos','data_hash']} for p in j['packets']];(out/'source-index.json').write_text(json.dumps({'source':str(source),'sourceSHA256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'moov':moov,'selectedTrack':0,'timebase':15360,'samplesPerSecond':30,'packets':packets},indent=2))
