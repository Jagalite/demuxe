#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Pinned official WMA Lossless24 tuples, actual ASF framing and scalar FFmpeg9 PCM."""
import pathlib,subprocess,json,hashlib,struct,urllib.request
root=pathlib.Path('/tmp/demuxe-wma-p23-fixtures');root.mkdir(exist_ok=True)
ref=pathlib.Path('/tmp/demuxe-wma-native-reference');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
record=json.loads((ref/'build-record.json').read_text())
for name in ['ffmpeg','ffprobe']:assert sha(ref/name)==record['artifacts'][name]['sha256']
def framing(path):
 data=path.read_bytes();pos=30
 for _ in range(struct.unpack_from('<I',data,24)[0]):
  size=struct.unpack_from('<Q',data,pos+16)[0]
  if data[pos:pos+16]==bytes.fromhex('9107dcb7b7a9cf118ee600c00c205365') and data[pos+24:pos+40]==bytes.fromhex('409e69f84d5bcf11a8fd00805f5c442b'):
   count=struct.unpack_from('<I',data,pos+64)[0];fmt=data[pos+78:pos+78+count];tag,ch,rate,avg,align,bits,n=struct.unpack_from('<HHIIHHH',fmt);assert count==18+n
   return dict(codecTag=tag,channels=ch,sampleRate=rate,bitRate=avg*8,blockAlign=align,bitsPerSample=bits,extradataHex=fmt[18:].hex(),waveFormatHex=fmt.hex())
  assert size>=24;pos+=size
 raise ValueError('Missing ASF WAVEFORMATEX')
SAMPLES={'g2_24bit.wma': '0dbe31e8b7bc8b589df5109cf6e2a1a782cdf8491ecbc1cc1fee887648ff45b7', 'Mega_Weird_Audio_Test_24bit.wma': '1ce71dcd98db91d23896e84c602c774fc93eeb6afc94fd762382744d680d2bbd', 'master_audio_2.0_24bit.wma': 'a4d6a181944cc53e60a9b7e41e2e399ead9d58947b1285e81b1182bf0d9d121f'}
rows=[]
for name,digest in SAMPLES.items():
 source=root/name;url='https://fate-suite.ffmpeg.org/lossless-audio/'+name
 if not source.exists():urllib.request.urlretrieve(url,source)
 assert sha(source)==digest
 ident=source.stem;fm=framing(source);assert fm['channels']==2 and fm['bitsPerSample']==24 and fm['sampleRate']in[44100,48000]
 packet=root/(ident+'.packets.json');packet.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(source)]))
 frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples','-of','json',str(source)]))
 pcm=root/(ident+'.s32');subprocess.run([str(ref/'ffmpeg'),'-v','error','-xerror','-cpuflags','0','-y','-i',str(source),'-af','asetpts=N/SR/TB','-f','s32le',str(pcm)],check=True)
 rows.append(dict(id=ident,profile='wma-advanced',codec='wmalossless',sampleRate=fm['sampleRate'],channels=fm['channels'],bitsPerSample=24,input=str(source),inputSHA256=sha(source),sourceURL=url,packetSHA256=sha(packet),framesSHA256=sha(frames),referenceSHA256=sha(pcm),referenceSamples=pcm.stat().st_size//8,framing=fm,generated=True))
browser=[]
for row in rows:
 p=root/(row['id']+'.f32');subprocess.run([str(ref/'ffmpeg'),'-v','error','-xerror','-cpuflags','0','-y','-i',row['input'],'-af','asetpts=N/SR/TB','-f','f32le',str(p)],check=True)
 (root/(row['id']+'.json')).write_bytes((root/(row['id']+'.packets.json')).read_bytes())
 browser.append(dict(row,fixtureRoot=str(root),referenceF32SHA256=sha(p),seekContract='restart-from-start-and-discard',packetFraming='one-original-complete-ASF-codec-block'))
(root/'packet-browser.json').write_text(json.dumps(browser,indent=2)+'\n')
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'WMA Lossless24 fixtures')
