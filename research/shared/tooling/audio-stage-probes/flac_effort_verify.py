# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib
p=pathlib.Path(sys.argv[1]);rows=[]
def probe(f):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-show_data_hash','sha256','-of','json',str(f)]))
for name in ['tonal','noise']:
 source=probe(p/(name+'.mkv'));vref=[r['data_hash']for r in source['packets']if r['codec_type']=='video'];ref=(p/(name+'.s16')).read_bytes()
 for level in [0,5]:
  file=p/f'{name}-level{level}.mp4';b=probe(file);packets=[r for r in b['packets']if r['codec_type']=='audio'];duration=[r['duration']for r in packets];vid=[r['data_hash']for r in b['packets']if r['codec_type']=='video'];actual=subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-f','s16le','-']);r={'name':name,'level':level,'PCMExact':actual==ref,'videoPackets':len(vid),'videoPayloadsExact':vid==vref,'audioPackets':len(packets),'fixedDurationSequence':duration==[4608]*312+[2304],'PCM_SHA256':hashlib.sha256(actual).hexdigest()};assert r['PCMExact']and r['videoPayloadsExact']and r['fixedDurationSequence'];rows.append(r)
(p/'host-results.json').write_text(json.dumps(rows,indent=2));print(json.dumps(rows))
