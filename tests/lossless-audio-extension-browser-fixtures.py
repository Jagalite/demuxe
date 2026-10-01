#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Three-second browser envelopes, separately pinned from complete native proof."""
import pathlib,json,subprocess,hashlib,shutil,os
source=pathlib.Path('/tmp/demuxe-lossless-extensions');root=pathlib.Path(os.environ.get('LOSSLESS_BROWSER_ROOT','/tmp/demuxe-lossless-browser'));root.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
unhex=lambda text:bytes.fromhex(''.join(line.split(':')[1].split('  ')[0].replace(' ','')for line in text.split('\n')if ':'in line))
def composition_audio(original,data,ident,default_path):
 # The official51 three-second packet prefix is silent. Composition needs the
 # independently qualified original audible tail; packet proof keeps its prefix.
 if original['id']!='dtshd-official51':return default_path,ident,None
 assert len(data['packets'])==337
 first=308;chosen=data['packets'][first:];assert len(chosen)==29
 frames=json.loads((source/(original['id']+'.frames.json')).read_text())['frames'];assert len(frames)==337 and all(frame['nb_samples']==512 for frame in frames)
 reference_id=ident+'-audible-tail';audio=root/(reference_id+'.dts');audio.write_bytes(b''.join(unhex(packet['data'])for packet in chosen))
 for fmt,suffix in [('s32le','s32'),('f32le','f32')]:
  reference=root/(reference_id+'.'+suffix);subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',str(audio),'-f',fmt,str(reference)],check=True)
  complete=(source/(original['id']+'.'+suffix)).read_bytes();assert hashlib.sha256(complete).hexdigest()==original['referenceSHA256'if suffix=='s32'else'referenceF32SHA256']
  assert reference.read_bytes()==complete[first*512*original['channels']*4:]
 assert (root/(reference_id+'.s32')).stat().st_size==14848*original['channels']*4
 assert any((root/(reference_id+'.s32')).read_bytes())
 derivation=dict(nativeQualifiedInputSHA256=original['inputSHA256'],nativeFixtureId=original['id'],firstOriginalPacket=first,completePacketCount=len(chosen),sourcePacketCount=len(data['packets']),decodedSamples=14848,originalReferenceSliceStartSample=first*512,originalReferenceByteExact=True,reason='Original complete audible tail; silent three-second packet prefix remains separately qualified')
 return audio,reference_id,derivation
rows=json.loads((source/'fixtures.json').read_text());selected=[]
for codec in ['truehd','mlp']:
 for rate in [44100,96000]:
  for channels in [1,2,6]:
   for bits in ([24]if codec=='truehd'else[16,24]):selected.append(next(f for f in rows if f['codec']==codec and f['sampleRate']==rate and f['channels']==channels and f['bitsPerSample']==bits and(codec!='truehd'or f['id'].startswith('truehd24-'))))
selected.extend(f for f in rows if f['codec']=='dts-hd');packets=[];compositions=[]
for original in selected:
 ident='browser-'+original['id'];data=json.loads((source/(original['id']+'.json')).read_text());prefix=[p for p in data['packets']if float(p['pts_time'])<3];ext=pathlib.Path(original['input']).suffix;p=root/(ident+ext);p.write_bytes(b''.join(unhex(packet['data'])for packet in prefix))
 raw=subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-show_data','-of','json',str(p)]);(root/(ident+'.json')).write_bytes(raw)
 for fmt,suffix in [('s32le','s32'),('f32le','f32')]:subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',str(p),'-f',fmt,str(root/(ident+'.'+suffix))],check=True)
 f=dict(original,id=ident,input=str(p),fixtureRoot=str(root),inputSHA256=sha(p),packetSHA256=sha(root/(ident+'.json')),referenceSHA256=sha(root/(ident+'.s32')),referenceF32SHA256=sha(root/(ident+'.f32')),referenceSamples=(root/(ident+'.s32')).stat().st_size//(4*original['channels']),generated=True,browserDerivation=dict(nativeQualifiedInputSHA256=original['inputSHA256'],nativeFixtureId=original['id'],completePacketPrefix=len(prefix),nominalSeconds=3))
 f.pop('framesSHA256',None);packets.append(f);videoid=ident+'-video';audio,reference_id,audible_derivation=composition_audio(original,data,ident,p);video=root/(videoid+'.mkv');subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=128x72:rate=10:duration=3','-i',str(audio),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','ultrafast','-profile:v','baseline','-level','1.1','-pix_fmt','yuv420p','-bf','0','-c:a','copy','-strict','-2',str(video)],check=True)
 for suffix in ['s32','f32']:shutil.copyfile(root/(reference_id+'.'+suffix),root/(videoid+'.'+suffix))
 composition=dict(f,id=videoid,input=str(video),inputSHA256=sha(video),container='matroska',referenceSHA256=sha(root/(videoid+'.s32')),referenceF32SHA256=sha(root/(videoid+'.f32')),referenceSamples=(root/(videoid+'.s32')).stat().st_size//(4*original['channels']))
 if audible_derivation:composition['browserDerivation']=audible_derivation
 compositions.append(composition)
base=next(f for f in packets if f['codec']=='mlp'and f['channels']==2 and f['sampleRate']==44100 and f['bitsPerSample']==16)
for ident,changed in [('browser-mlp-wrongbits',dict(bitsPerSample=24)),('browser-mlp-unsupportedrate',dict(sampleRate=32000)),('browser-mlp-wide',dict(channels=8))]:
 for ext in ['json','s32','f32']:shutil.copyfile(root/(base['id']+'.'+ext),root/(ident+'.'+ext))
 packets.append(dict(base,id=ident,expectedRejection='PROVIDER_PROFILE_MISMATCH',**changed))
base=next(f for f in compositions if f['codec']=='mlp'and f['channels']==2 and f['sampleRate']==44100 and f['bitsPerSample']==16)
for ident,changed in [('browser-mlp-wrongrate-video',dict(sampleRate=48000)),('browser-mlp-wrongchannels-video',dict(channels=1))]:
 for ext in ['mkv','s32','f32']:shutil.copyfile(root/(base['id']+'.'+ext),root/(ident+'.'+ext))
 compositions.append(dict(base,id=ident,input=str(root/(ident+'.mkv')),expectedRejection='PROVIDER_PROFILE_MISMATCH',**changed))
(root/'packet-browser.json').write_text(json.dumps(packets,indent=2)+'\n');(root/'composition-browser.json').write_text(json.dumps(compositions,indent=2)+'\n');print(len(selected),'positive bounded envelopes',len(packets),'packets',len(compositions),'compositions')
