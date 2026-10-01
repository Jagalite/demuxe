#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Historical48 kHz original source regressions and explicit browser duration variants."""
import pathlib,json,subprocess,hashlib,shutil,os
origin=pathlib.Path('/Volumes/seed2/Projects/demuxe-media-components');root=pathlib.Path(os.environ.get('LOSSLESS_HISTORICAL_ROOT','/tmp/demuxe-lossless-historical'));root.mkdir(parents=True,exist_ok=True);rows=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
unhex=lambda text:bytes.fromhex(''.join(line.split(':')[1].split('  ')[0].replace(' ','')for line in text.split('\n')if ':'in line))
for f in json.loads((origin/'build/provider-lossless-audio/fixtures.json').read_text())['fixtures']:
 old=origin/f['input'];assert sha(old)==f['sourceSHA256'];ident='historical-'+f['id'];raw=root/(ident+('.dts'if f['codec']=='dts-hd'else'.mlp'if f['codec']=='mlp'else'.thd'));data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_packets','-show_data','-of','json',str(old)]));raw.write_bytes(b''.join(unhex(p['data'])for p in data['packets']))
 def register(ident,raw,derivation):
  data=subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(raw)]);(root/(ident+'.json')).write_bytes(data);stream=json.loads(data)['streams'][0]
  for fmt,ext in [('s32le','s32'),('f32le','f32')]:subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',str(raw),'-f',fmt,str(root/(ident+'.'+ext))],check=True)
  frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output(['ffprobe','-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples,sample_fmt,channel_layout','-of','json',str(raw)]))
  assert stream['channels']==f['channels'];rows.append(dict(id=ident,codec=f['codec'],profile='dts-hd'if f['codec']=='dts-hd'else'truehd-mlp',input=str(raw),inputSHA256=sha(raw),packetSHA256=sha(root/(ident+'.json')),framesSHA256=sha(frames),sampleRate=int(stream['sample_rate']),channels=stream['channels'],bitsPerSample=int(stream['bits_per_raw_sample']),referenceSHA256=sha(root/(ident+'.s32')),referenceF32SHA256=sha(root/(ident+'.f32')),referenceSamples=(root/(ident+'.s32')).stat().st_size//(4*f['channels']),fixtureRoot=str(root),generated=True,derivation=derivation))
 register(ident,raw,dict(originalProviderFixture=f['input'],originalSourceSHA256=f['sourceSHA256'],originalSeconds=f['seconds']))
 browserid='browser-'+ident;browser=root/(browserid+raw.suffix)
 if f['channels']==8:
  parsed=json.loads((root/(ident+'.json')).read_text());prefix=[p for p in parsed['packets']if float(p['pts_time'])<3];browser.write_bytes(b''.join(unhex(p['data'])for p in prefix));derivation=dict(originalProviderFixture=f['input'],originalSourceSHA256=f['sourceSHA256'],completePacketPrefix=len(prefix),nominalSeconds=3)
 else:
  wave='|'.join('0.08*sin(2*PI*'+str(hz)+'*t)'for hz in f['frequencies']);subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','aevalsrc='+wave+':s=48000:d=3:c='+('stereo'if f['channels']==2 else'5.1'),'-c:a',f['codec'],'-strict','-2',str(browser)],check=True);derivation=dict(originalProviderFixture=f['input'],originalSourceSHA256=f['sourceSHA256'],originalToneRecipe=f['frequencies'],originalSeconds=1,regeneratedSeconds=3)
 register(browserid,browser,derivation)
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n')
packet_browser=[f for f in rows if f['id'].startswith('browser-')];compositions=[]
for f in packet_browser:
 ident=f['id']+'-video';p=root/(ident+'.mkv');audio=f['input'];reference_id=f['id'];composition=dict(f)
 if f['id']=='browser-historical-dtshd-71':
  full_id='historical-dtshd-71';packets=json.loads((root/(full_id+'.json')).read_text())['packets'];frames=json.loads((root/(full_id+'.frames.json')).read_text())['frames'];first=282;last=564
  assert len(packets)==750 and len(frames)==750 and all(x['nb_samples']==512 for x in frames)
  reference_id=ident+'-audible';audio=str(root/(reference_id+'.dts'));pathlib.Path(audio).write_bytes(b''.join(unhex(x['data'])for x in packets[first:last]))
  for fmt,ext in [('s32le','s32'),('f32le','f32')]:
   target=root/(reference_id+'.'+ext);subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',audio,'-f',fmt,str(target)],check=True)
   assert target.read_bytes()==(root/(full_id+'.'+ext)).read_bytes()[first*512*8*4:last*512*8*4]
  assert any((root/(reference_id+'.s32')).read_bytes())
  composition.update(referenceSHA256=sha(root/(reference_id+'.s32')),referenceF32SHA256=sha(root/(reference_id+'.f32')),referenceSamples=(last-first)*512,browserDerivation=dict(firstOriginalPacket=first,completePacketCount=last-first,sourcePacketCount=len(packets),originalReferenceSliceStartSample=first*512,originalReferenceByteExact=True,nativeQualifiedInputSHA256=sha(root/(full_id+'.dts')),reason='Original complete audible range; silent packet prefix remains separately qualified'))
 subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=128x72:rate=10:duration=3','-i',audio,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','ultrafast','-profile:v','baseline','-level','1.1','-pix_fmt','yuv420p','-bf','0','-c:a','copy','-strict','-2',str(p)],check=True)
 for ext in ['s32','f32']:shutil.copyfile(root/(reference_id+'.'+ext),root/(ident+'.'+ext))
 compositions.append(dict(composition,id=ident,input=str(p),inputSHA256=sha(p),container='matroska'))
(root/'packet-browser.json').write_text(json.dumps(packet_browser,indent=2)+'\n');(root/'composition-browser.json').write_text(json.dumps(compositions,indent=2)+'\n');print(len(rows),'native regressions',len(packet_browser),'browser historical envelopes')
