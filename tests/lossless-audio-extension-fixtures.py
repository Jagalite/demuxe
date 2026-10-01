#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exact raw native packet clocks and separate real Matroska composition inputs."""
import pathlib,subprocess,json,hashlib,os,shutil,urllib.request,urllib.parse
root=pathlib.Path(os.environ.get('LOSSLESS_EXTENSION_ROOT','/tmp/demuxe-lossless-extensions'));root.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
def register(ident,p,codec,url=None,origin_sha=None,derivation=None):
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_data','-of','json',str(p)]));stream=data['streams'][0];assert stream['channels']in[1,2,6];packet=root/(ident+'.json');packet.write_text(json.dumps(data))
 for fmt,suffix in [('s32le','s32'),('f32le','f32')]:subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-y','-i',str(p),'-map','0:a:0','-f',fmt,str(root/(ident+'.'+suffix))],check=True)
 frames=root/(ident+'.frames.json');frames.write_text(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_frames','-show_entries','frame=pts_time,nb_samples,sample_fmt,channel_layout','-of','json',str(p)]).decode())
 rows.append(dict(id=ident,profile='dts-hd'if codec=='dts-hd'else'truehd-mlp',codec=codec,sampleRate=int(stream['sample_rate']),channels=stream['channels'],bitsPerSample=int(stream['bits_per_raw_sample']),input=str(p),inputSHA256=sha(p),packetSHA256=sha(packet),referenceSHA256=sha(root/(ident+'.s32')),referenceF32SHA256=sha(root/(ident+'.f32')),framesSHA256=sha(frames),sourceURL=url,originSHA256=origin_sha,derivation=derivation))
origins=[('mlp-official441','mlp','https://samples.ffmpeg.org/A-codecs/lossless/mlp/440hz.mlp','440hz.mlp','c46b722bbf56c8316a8088cbf1bc7a3f9eeac529699e7fe4600d449f4d0760d9'),('truehd-official48','truehd','https://samples.ffmpeg.org/A-codecs/TrueHD/TrueHD.raw','TrueHD.raw','221b59a28347b610c60019e4d4896bb9ac0be88642c6964c5876ba558f0d511c'),('dtshd-official51','dts-hd','https://samples.ffmpeg.org/A-codecs/DTS/bond_sample_dtshdma.m2ts','bond_sample_dtshdma.m2ts','501d78c2ba7caec269e2d1981f1bab3138202dcb90b63e84614ee0408ffeaf27'),('dtshd-officialstereo','dts-hd','https://samples.ffmpeg.org/A-codecs/DTS/dts/'+urllib.parse.quote('Master Audio 2.0 16bit.dts'),'Master Audio 2.0 16bit.dts','34845219924fedc4c633a97c614f464f25011857d11b6ad1919e0c02f1abb3ce')]
for ident,codec,url,name,digest in origins:
 source=pathlib.Path('/tmp/demuxe-lossless-next-inventory')/name
 if not source.exists():
  if os.environ.get('LOSSLESS_FETCH_CANONICAL')!='1':raise ValueError('Missing official fixture: '+str(source))
  with urllib.request.urlopen(url,timeout=60)as response:source.write_bytes(response.read())
 assert sha(source)==digest
 p=root/(ident+('.mlp'if codec=='mlp'else'.thd'if codec=='truehd'else'.dts'))
 if name.endswith('.m2ts'):subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-map','0:a:0','-c:a','copy','-f','dts',str(p)],check=True)
 else:shutil.copyfile(source,p)
 derivation=None
 if codec=='dts-hd':
  original_sha=sha(p);parsed=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data','-of','json',str(p)]));count=337 if ident=='dtshd-official51' else 11025
  assert len(parsed['packets'])==count+1
  def unhex(text):return bytes.fromhex(''.join(line.split(':')[1].split('  ')[0].replace(' ','')for line in text.split('\n')if ':'in line))
  p.write_bytes(b''.join(unhex(packet['data'])for packet in parsed['packets'][:count]))
  derivation=dict(completePacketPrefix=count,sourcePackets=count+1,excludedCorruptFinalPackets=1,originalExtractedInputSHA256=original_sha,reason='ScalarFFmpeg strictdecode and actualnative both reject incomplete finalpacket')
 register(ident,p,codec,url,digest,derivation)
for codec in ['mlp','truehd']:
 for bits in [16,24]:
  for rate in [44100,96000]:
   for channels in [1,2,6]:
    ident=f'{codec}{bits}-{rate}-{channels}';p=root/(ident+('.mlp'if codec=='mlp'else'.thd'));layout='mono'if channels==1 else'stereo'if channels==2 else'5.1'if codec=='mlp'else'5.1(side)';wave='|'.join(f'0.08*sin(2*PI*{337+131*c}*t)'for c in range(channels))
    subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={wave}:s={rate}:d=6.137:c={layout}','-c:a',codec,'-strict','-2','-sample_fmt','s16p'if bits==16 else's32p','-bits_per_raw_sample',str(bits),str(p)],check=True);register(ident,p,codec)
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'lossless extension fixtures')
compositions=[]
for row in rows:
 p=root/(row['id']+'-video.mkv')
 subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','color=c=black:s=96x64:r=10:d=1','-i',row['input'],'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','ultrafast','-bf','0','-c:a','copy','-strict','-2',str(p)],check=True)
 compositions.append(dict(row,input=str(p),inputSHA256=sha(p)))
(root/'compositions.json').write_text(json.dumps(compositions,indent=2)+'\n')
packet_browser=[dict(row,fixtureRoot=str(root))for row in rows]
composition_browser=[]
for row in compositions:
 original=row['id'];row=dict(row,id=original+'-video',fixtureRoot=str(root),container='matroska',generated=True)
 for ext in ['s32','f32']:shutil.copyfile(root/(original+'.'+ext),root/(row['id']+'.'+ext))
 composition_browser.append(row)
packet_base=next(row for row in packet_browser if row['id']=='mlp16-44100-2')
for ident,changed in [('mlp441-stereo-wrongbits',dict(bitsPerSample=24)),('mlp441-stereo-unsupportedrate',dict(sampleRate=32000)),('mlp441-stereo-unsupportedwide',dict(channels=8))]:
 row=dict(packet_base,id=ident,expectedRejection='PROVIDER_PROFILE_MISMATCH',**changed)
 for ext in ['json','s32','f32']:shutil.copyfile(root/(packet_base['id']+'.'+ext),root/(ident+'.'+ext))
 packet_browser.append(row)
composition_base=next(row for row in composition_browser if row['id']=='mlp16-44100-2-video')
for ident,changed in [('mlp441-stereo-wrongrate-video',dict(sampleRate=48000)),('mlp441-stereo-wrongchannels-video',dict(channels=1))]:
 row=dict(composition_base,id=ident,input=str(root/(ident+'.mkv')),expectedRejection='PROVIDER_PROFILE_MISMATCH',**changed)
 for ext in ['mkv','s32','f32']:shutil.copyfile(root/(composition_base['id']+'.'+ext),root/(ident+'.'+ext))
 composition_browser.append(row)
(root/'packet-browser.json').write_text(json.dumps(packet_browser,indent=2)+'\n')
(root/'composition-browser.json').write_text(json.dumps(composition_browser,indent=2)+'\n')
