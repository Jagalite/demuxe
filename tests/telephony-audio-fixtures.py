#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Finite telephony blocks with independent scalar decoded PCM and original framing."""
import pathlib,json,struct,subprocess,hashlib,shutil,os,urllib.request
root=pathlib.Path(os.environ.get('TELEPHONY_FIXTURE_ROOT','/tmp/demuxe-telephony-fixtures'));root.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
inventory=json.load(open('results/media-components/codec-expansion/speech-adpcm-aac-inventory.json'));inputs=[]
for f in inventory['realFixtures']:
 if f['id'] not in ['gsm','gsm-ms']:continue
 p=pathlib.Path(f['path']);assert sha(p)==f['sha256'];inputs.append((f['id'],p,dict(sourceURL=f['url'],originSHA256=f['sha256'],generated=False)))
for codec in ['pcm_alaw','pcm_mulaw']:
 for rate in [8000,16000]:
  for channels in [1,2]:
   ident=f'{codec}-{rate}-{channels}';p=root/(ident+'.wav');wave='|'.join(f'.8*sin(2*PI*{301+181*c}*t)'for c in range(channels));subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={wave}:s={rate}:d=3.137','-c:a',codec,str(p)],check=True);inputs.append((ident,p,dict(generated=True)))
# Canonical long GSM independently exercises predictor state over211seconds.
long_url='https://samples.ffmpeg.org/A-codecs/GSM/sample-gsm-8000.gsm';long_sha='d749c338c50199672dfe638950411d7dadba1617cd56adebd7f8c6e9dddcab50';long=root/'gsm-long-original.gsm'
if not long.exists():
 if os.environ.get('TELEPHONY_FETCH_CANONICAL')!='1':raise ValueError('Missing pinned long GSM original')
 with urllib.request.urlopen(long_url,timeout=60)as response:long.write_bytes(response.read())
assert sha(long)==long_sha;inputs.append(('gsm-long',long,dict(sourceURL=long_url,originSHA256=long_sha,generated=False)))
# Every G.711 codeword is compared with the independent decoder, including signs.
for codec,tag in [('pcm-alaw',6),('pcm-mulaw',7)]:
 ident=codec+'-codebook';p=root/(ident+'.wav');payload=bytes(range(256))*100;fmt=struct.pack('<HHIIHHH',tag,1,8000,8000,1,8,0);body=b'WAVE'+b'fmt '+struct.pack('<I',len(fmt))+fmt+b'fact'+struct.pack('<II',4,len(payload))+b'data'+struct.pack('<I',len(payload))+payload;p.write_bytes(b'RIFF'+struct.pack('<I',len(body))+body);inputs.append((ident,p,dict(generated=True,exhaustiveCodebook=True)))
for codec,tag in [('pcm-alaw',6),('pcm-mulaw',7)]:
 ident=codec+'-classic16';p=root/(ident+'.wav');payload=bytes(range(256))*100;fmt=struct.pack('<HHIIHH',tag,1,8000,8000,1,8);body=b'WAVE'+b'fmt '+struct.pack('<I',len(fmt))+fmt+b'data'+struct.pack('<I',len(payload))+payload;p.write_bytes(b'RIFF'+struct.pack('<I',len(body))+body);inputs.append((ident,p,dict(generated=True,exhaustiveCodebook=True,classicFormat16NoFact=True)))
rows=[]
for ident,source,origin in inputs:
 media=root/(ident+source.suffix)
 if media!=source:shutil.copyfile(source,media)
 blob=media.read_bytes();extra=b'';offsets={};fact=None
 if media.suffix=='.wav':
  pos=12;chunks=[]
  while pos<len(blob):
   tag=blob[pos:pos+4];n=struct.unpack_from('<I',blob,pos+4)[0];chunks.append((tag,pos+8,n));pos+=8+n+(n&1)
  fmt=next((p,n)for tag,p,n in chunks if tag==b'fmt ');data=next((p,n)for tag,p,n in chunks if tag==b'data');tag,channels,rate,average,align,bits=struct.unpack_from('<HHIIHH',blob,fmt[0]);extra=blob[fmt[0]+18:fmt[0]+fmt[1]]if fmt[1]>16 else b'';payload=blob[data[0]:data[0]+data[1]];codec={6:'pcm-alaw',7:'pcm-mulaw',49:'gsm-ms'}[tag];samples_per_block=320 if tag==49 else 1;block=65 if tag==49 else 512*channels;offsets=dict(fmt=fmt[0],data=data[0]);fact_offset=next((p for t,p,n in chunks if t==b'fact'),None)
  if fact_offset is not None:offsets['fact']=fact_offset
  fact=next((struct.unpack_from('<I',blob,p)[0]for t,p,n in chunks if t==b'fact'),None)
 else:payload=blob;codec='gsm';rate=8000;channels=1;bits=0;align=33;average=1650;block=33;samples_per_block=160
 packets=[];clock=0
 for at in range(0,len(payload),block):
  part=payload[at:at+block];assert len(part)%align==0;count=samples_per_block if codec in ['gsm','gsm-ms'] else len(part)//channels;packets.append(dict(pts=clock,pts_time=f'{clock/rate:.9f}',duration=count,data='\n'+''.join(f'{i:08x}: '+part[i:i+16].hex(' ')+'  .\n'for i in range(0,len(part),16))));clock+=count
 host=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(media)]));host_path=root/(ident+'.host.json');host_path.write_text(json.dumps(host,indent=2)+'\n');hostpayload=b''.join(bytes.fromhex(''.join(line.split(':')[1].split('  ')[0].replace(' ','')for line in p['data'].splitlines()if ':'in line))for p in host['packets']);assert hostpayload==payload
 time_num,time_den=map(int,host['streams'][0]['time_base'].split('/'));host_clock=0
 for packet in host['packets']:
  assert int(packet['pts'])*time_num*rate==host_clock*time_den
  extent=int(packet['duration'])*time_num*rate;assert extent%time_den==0;host_clock+=extent//time_den
 assert host_clock==clock
 for fmt,ext in [('s32le','s32'),('f32le','f32')]:subprocess.run(['ffmpeg','-v','error','-xerror','-cpuflags','0','-c:a',codec.replace('-','_'),'-y','-i',str(media),'-map','0:a:0','-f',fmt,str(root/(ident+'.'+ext))],check=True)
 ref=root/(ident+'.s32');assert ref.stat().st_size//4//channels==clock
 packet_path=root/(ident+'.json');packet_path.write_text(json.dumps(dict(packets=packets),indent=2)+'\n')
 rows.append(dict(id=ident,profile='telephony',codec=codec,sampleRate=rate,channels=channels,bitsPerSample=bits,decodedBitsPerSample=16,input=str(media),inputSHA256=sha(media),fixtureRoot=str(root),packetSHA256=sha(packet_path),hostPacketSHA256=sha(host_path),referenceSHA256=sha(ref),referenceF32SHA256=sha(root/(ident+'.f32')),referenceSamples=clock,framing=dict(blockAlign=align,bitRate=average*8),extradata=extra.hex(),offsets=offsets,factSamples=fact,seekContract='restart-from-start-and-discard'if codec.startswith('gsm')else'packet-independent',**origin))
# Independent presentation endpoint clips only the final original GSM-MS block.
base=next(row for row in rows if row['id']=='gsm-ms');clip_id='gsm-ms-fact-clipped';clip_path=root/(clip_id+'.wav');changed=bytearray(pathlib.Path(base['input']).read_bytes());position=12
while changed[position:position+4]!=b'fact':
 size=struct.unpack_from('<I',changed,position+4)[0];position+=8+size+(size&1)
clip_samples=base['referenceSamples']-123;struct.pack_into('<I',changed,position+8,clip_samples);clip_path.write_bytes(changed)
for ext in ['s32','f32']:(root/(clip_id+'.'+ext)).write_bytes((root/(base['id']+'.'+ext)).read_bytes()[:clip_samples*4])
for ext in ['json','host.json']:shutil.copyfile(root/(base['id']+'.'+ext),root/(clip_id+'.'+ext))
clipped={**base,'id':clip_id,'input':str(clip_path),'inputSHA256':sha(clip_path),'referenceSamples':clip_samples,'decodedSamples':base['referenceSamples'],'factSamples':clip_samples,'referenceSHA256':sha(root/(clip_id+'.s32')),'referenceF32SHA256':sha(root/(clip_id+'.f32')),'derivation':'Only independently declared fact endpoint shortened123samples; original compressed GSM-MS blocks preserved.'}
(root/'composition-fixtures.json').write_text(json.dumps(rows+[clipped],indent=2)+'\n')
composition=[]
for row in rows+[clipped]:
 ident='standalone-'+row['id']+'-flac'
 for ext in [pathlib.Path(row['input']).suffix[1:],'json','s32','f32']:shutil.copyfile(root/(row['id']+'.'+ext),root/(ident+'.'+ext))
 composition.append({**row,'id':ident,'input':str(root/(ident+pathlib.Path(row['input']).suffix)),'container':'gsm'if row['codec']=='gsm'else'wave','audioOnly':True,'generated':True,'fixtureOrigin':'synthetic'if row['generated']else'official'})
(root/'composition-browser.json').write_text(json.dumps(composition,indent=2)+'\n')
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');(root/'packet-browser.json').write_text(json.dumps([{**row,'generated':True,'fixtureOrigin':'synthetic'if row['generated']else'official'}for row in rows],indent=2)+'\n');print(len(rows),'telephony fixtures ready')
