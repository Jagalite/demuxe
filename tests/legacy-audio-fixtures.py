#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Pinned-family qualification fixtures; ASF metadata supplies actual WMA framing."""
import pathlib, subprocess, json, hashlib, os, struct, urllib.request
root=pathlib.Path(os.environ.get('LEGACY_AUDIO_FIXTURE_ROOT','/tmp/demuxe-legacy-audio-fixtures'));root.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def asf_audio_format(path):
 data=path.read_bytes();pos=30
 for _ in range(struct.unpack_from('<I',data,24)[0]):
  guid=data[pos:pos+16];size=struct.unpack_from('<Q',data,pos+16)[0]
  if guid==bytes.fromhex('9107dcb7b7a9cf118ee600c00c205365') and data[pos+24:pos+40]==bytes.fromhex('409e69f84d5bcf11a8fd00805f5c442b'):
   count=struct.unpack_from('<I',data,pos+64)[0];fmt=data[pos+78:pos+78+count]
   tag,channels,rate,avg,align,bits=struct.unpack_from('<HHIIHH',fmt)
   extra_size=struct.unpack_from('<H',fmt,16)[0]
   assert count==18+extra_size
   return dict(codecTag=tag,channels=channels,sampleRate=rate,bitRate=avg*8,blockAlign=align,bitsPerSample=bits,extradataHex=fmt[18:].hex(),waveFormatHex=fmt.hex())
  assert size>=24;pos+=size
 raise ValueError('ASF audio WAVEFORMATEX missing')
rows=[];compositions=[]
mp1=root/'mp1-canonical.mp1';mp1_url='https://samples.ffmpeg.org/A-codecs/mp1-sample.mp1';mp1_sha='8bffe46c1a1ba709b35f4782c1a661d0081e8ef84222edcf518ee5e4c2e77f13'
if not mp1.exists() and os.environ.get('LEGACY_FETCH_CANONICAL')=='1':
 with urllib.request.urlopen(mp1_url,timeout=30) as response:mp1.write_bytes(response.read())
if mp1.exists():
 assert sha(mp1)==mp1_sha,'Canonical MP1 bytes changed'
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(mp1)]));stream=data['streams'][0]
 (root/'mp1-canonical.json').write_text(json.dumps(data))
 subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-c:a','mp1float','-i',str(mp1),'-map','0:a:0','-f','f32le',str(root/'mp1-canonical.f32')],check=True)
 rows.append(dict(id='mp1-canonical',profile='legacy',codec='mp1',sampleRate=int(stream['sample_rate']),channels=stream['channels'],bitsPerSample=16,generated=True,input=str(mp1),inputSHA256=mp1_sha,sourceURL=mp1_url,packetSHA256=sha(root/'mp1-canonical.json'),framing={}))
else:rows.append(dict(id='mp1-unavailable',profile='legacy',codec='mp1',generated=False,generationError='No local pinned canonical MP1 sample. Set LEGACY_FETCH_CANONICAL=1 to fetch official FFmpeg sample.'))
for codec in ['mp2','wmav1','wmav2']:
 for rate,channels in [(44100,1),(44100,2),(48000,1),(48000,2)]:
  ident=f'{codec}-{rate}-{channels}';out=root/(ident+('.mkv' if codec=='mp2' else '.wma'))
  wave='|'.join(f'0.09*sin(2*PI*{337+191*c}*t)' for c in range(channels))
  args=['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={wave}:s={rate}:d=6.137','-c:a',codec,'-b:a','128k','-ac',str(channels),'-ar',str(rate),str(out)]
  subprocess.run(args,check=True)
  data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(out)]))
  (root/(ident+'.json')).write_text(json.dumps(data))
  subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y',*(['-c:a','mp2float'] if codec=='mp2' else []),'-i',str(out),'-map','0:a:0','-f','f32le',str(root/(ident+'.f32'))],check=True)
  frame_meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_frames','-show_entries','frame=pts_time,best_effort_timestamp_time,nb_samples','-of','json',str(out)]));(root/(ident+'.frames.json')).write_text(json.dumps(frame_meta))
  framing=asf_audio_format(out) if codec.startswith('wma') else {}
  if framing:assert framing['sampleRate']==rate and framing['channels']==channels and framing['codecTag']==(0x160 if codec=='wmav1' else 0x161)
  rows.append(dict(id=ident,profile='legacy',codec=codec,sampleRate=rate,channels=channels,bitsPerSample=framing.get('bitsPerSample',16),generated=True,input=str(out),inputSHA256=sha(out),packetSHA256=sha(root/(ident+'.json')),framesSHA256=sha(root/(ident+'.frames.json')),framing=framing))
  video=root/(ident+'-video.mkv')
  subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=96x64:rate=25:duration=6.137','-i',str(out),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','ultrafast','-bf','0','-g','25','-c:a','copy',str(video)],check=True)
  compositions.append(dict(id=ident+'-video',profile='legacy',codec=codec,sampleRate=rate,channels=channels,bitsPerSample=framing.get('bitsPerSample',16),generated=True,input=str(video),inputSHA256=sha(video),framing=framing,output='flac'))
(root/'compositions.json').write_text(json.dumps(compositions,indent=2)+'\n')
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(sum(x.get('generated') is True for x in rows),'generated legacy cases;',len(compositions),'no-reorder MKV compositions',root)
