#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate IMA-QT MOV packets and pinned independent scalar PCM references."""
import pathlib,json,hashlib,subprocess,math,struct
root=pathlib.Path('/tmp/demuxe-imaqt-fixtures');root.mkdir(exist_ok=True);ref=pathlib.Path('/tmp/demuxe-imaqt-native-reference');record=json.loads((ref/'build-record.json').read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
for n in ['ffmpeg','ffprobe']:assert sha(ref/n)==record['artifacts'][n]['sha256']
ff=str(ref/'ffmpeg');probe=str(ref/'ffprobe');rows=[]
for rate in [44100,48000]:
 for ch in [1,2]:
  ident=f'imaqt-{rate}-{ch}';raw=root/(ident+'.raw');source=root/(ident+'.mov');samples=rate*3+7
  raw.write_bytes(b''.join(struct.pack('<h',round(17000*math.sin(i*(c+1)*.053)+4000*math.sin(i*.002)))for i in range(samples)for c in range(ch)))
  subprocess.run([ff,'-v','error','-y','-cpuflags','0','-f','s16le','-ar',str(rate),'-ac',str(ch),'-i',str(raw),'-c:a','adpcm_ima_qt',str(source)],check=True)
  packet=root/(ident+'.json');packet.write_bytes(subprocess.check_output([probe,'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(source)]));data=json.loads(packet.read_bytes());stream=data['streams'][0];assert stream['codec_name']=='adpcm_ima_qt'and int(stream['sample_rate'])==rate and stream['channels']==ch
  assert all(int(p['size'])==34*ch and int(p['pts'])==i*64 for i,p in enumerate(data['packets']))
  frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output([probe,'-v','error','-show_frames','-show_entries','frame=pts,nb_samples,sample_fmt,channel_layout','-of','json',str(source)]));shape=json.loads(frames.read_bytes())['frames'];assert all(f['nb_samples']==64 for f in shape)
  for ext in ['s32','f32']:subprocess.run([ff,'-v','error','-xerror','-y','-cpuflags','0','-i',str(source),'-f',ext+'le',str(root/(ident+'.'+ext))],check=True)
  rows.append(dict(id=ident,profile='adpcm-qt',codec='adpcm-ima-qt',sampleRate=rate,channels=ch,bitsPerSample=4,input=str(source),inputSHA256=sha(source),packetSHA256=sha(packet),framesSHA256=sha(frames),referenceSamples=len(shape)*64,sourceSamples=samples,referenceSHA256=sha(root/(ident+'.s32')),referenceF32SHA256=sha(root/(ident+'.f32')),framing=dict(blockAlign=34*ch,bitRate=0),fixtureRoot=str(root),generated=True,seekContract='restart-from-start-and-discard',packetFraming='one-original-complete-MOV-IMA-QT-block',samplesPerBlock=64,sourceContainer='isobmff'))
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print('IMA-QT fixtures',len(rows))
# Public-reader candidates retain one visible H264 track and original audio bytes.
compositions=[]
def unhex(s):return bytes.fromhex(''.join(l.split(':')[1].split('  ')[0].replace(' ','')for l in s.splitlines()if ':'in l))
for f in rows:
 ident=f['id']+'-video';source=root/(ident+'.mov');subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=128x72:rate=25:duration=3.2','-i',f['input'],'-map','0:v','-map','1:a','-c:v','libx264','-profile:v','baseline','-preset','ultrafast','-tune','zerolatency','-bf','0','-g','25','-c:a','copy','-use_editlist','0','-movflags','+faststart',str(source)],check=True)
 metadata=json.loads(subprocess.check_output([probe,'-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_data','-of','json',str(source)]));original=json.loads((root/(f['id']+'.json')).read_text());assert [(unhex(p['data']),p['pts'],p['duration'])for p in metadata['packets']]==[(unhex(p['data']),p['pts'],p['duration'])for p in original['packets']]
 for ext in ['s32','f32']:(root/(ident+'.'+ext)).write_bytes((root/(f['id']+'.'+ext)).read_bytes()[:f['sourceSamples']*f['channels']*4])
 compositions.append({**f,'id':ident,'input':str(source),'inputSHA256':sha(source),'container':'isobmff','referenceSamples':f['sourceSamples'],'referenceSHA256':sha(root/(ident+'.s32')),'referenceF32SHA256':sha(root/(ident+'.f32')),'encodings':['flac'],'sourceFixtureId':f['id'],'presentationContract':'original-stts-final-block-clip','packetCopyVerified':True})
(root/'packet-browser.json').write_text(json.dumps(rows,indent=2)+'\n');(root/'compositions.json').write_text(json.dumps(compositions,indent=2)+'\n')
