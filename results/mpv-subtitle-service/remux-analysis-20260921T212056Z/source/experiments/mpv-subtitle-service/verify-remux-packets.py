# SPDX-License-Identifier: Apache-2.0
"""Check packet-copy identity, presentation spacing, and strictly increasing DTS."""
import json,subprocess,sys
from pathlib import Path
out=Path(sys.argv[1]);results=[]
def packets(path,selection="v:0"):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams',selection,'-show_packets','-show_data_hash','sha256','-of','json',str(path)]))['packets']
for name in ['rejected-bframes','rejected-long-gop','qualified']:
 source=packets(Path('build/mpv-subtitle-service/fixtures')/(name+'.mkv'))
 coded=packets(out/(name+'-prefix.mp4'))
 assert len(coded)>=12,(name,'insufficient packets')
 delta=float(coded[0]['pts_time'])-float(source[0]['pts_time'])
 for i,q in enumerate(coded):
  assert q['data_hash']==source[i]['data_hash'],(name,i,'encoded payload changed')
  assert abs(float(q['pts_time'])-float(source[i]['pts_time'])-delta)<.00001,(name,i,'presentation spacing changed')
  assert float(q['dts_time'])<=float(q['pts_time'])+.000001,(name,i,'DTS after PTS')
  if i:assert int(q['dts'])>int(coded[i-1]['dts']),(name,i,'non-monotonic DTS')
 audio_source=packets(Path('build/mpv-subtitle-service/fixtures')/(name+'.mkv'),'a:0')
 audio_coded=packets(out/(name+'-prefix.mp4'),'a:0')
 audio_delta=float(audio_coded[0]['pts_time'])-float(audio_source[0]['pts_time'])
 audio_error=max(abs(float(q['pts_time'])-float(audio_source[i]['pts_time'])-audio_delta) for i,q in enumerate(audio_coded))
 assert all(q['data_hash']==audio_source[i]['data_hash'] for i,q in enumerate(audio_coded)),(name,'audio payload changed')
 # Authored fixture AAC is 44.1 kHz; output rounding is at most one sample.
 assert abs(audio_delta-delta)<1/44100 and audio_error<1/44100,(name,'audio/video timing changed')
 results.append({'audioPackets':len(audio_coded),'audioMaxTimestampErrorSeconds':audio_error,'audioPayloadIdentity':True,'fixture':name,'packets':len(coded),'constantPresentationShiftSeconds':delta,'payloadIdentity':True,'presentationSpacing':True,'strictDTS':True})
(out/'av-packet-verification.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
