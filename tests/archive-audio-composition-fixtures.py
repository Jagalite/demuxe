#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Real maintained A_WAVPACK4 mapping via independent host Matroska muxer."""
import pathlib,json,subprocess,hashlib,os,shutil
root=pathlib.Path(os.environ.get('ARCHIVE_AUDIO_FIXTURE_ROOT','/tmp/demuxe-archive-audio-fixtures'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
for f in json.loads((root/'fixtures.json').read_text()):
 if f['codec']!='wavpack':continue
 name=f['id']+'-video';out=root/(name+'.mkv');duration='6.137' if f['id']!='wavpack-canonical' else '60.48'
 subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=96x64:rate=25:duration='+duration,'-i',f['input'],'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','ultrafast','-bf','0','-g','25','-c:a','copy',str(out)],check=True)
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_data','-of','json',str(out)]));packet=root/(name+'.json');packet.write_text(json.dumps(data))
 for suffix in ['s32','f32']:shutil.copyfile(root/(f['id']+'.'+suffix),root/(name+'.'+suffix))
 rows.append(dict(f,rejectionReason='unsupported-float-mode' if f.get('expectedRejection') else 'precision-exceeds-flac24' if f['bitsPerSample']>24 else None,id=name,input=str(out),inputSHA256=sha(out),packetSHA256=sha(packet),expectedRejection='PROVIDER_PROFILE_MISMATCH' if f['bitsPerSample']>24 or f.get('expectedRejection') else None,output='flac'))
(root/'compositions.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'maintained WavPack MKV fixtures')
