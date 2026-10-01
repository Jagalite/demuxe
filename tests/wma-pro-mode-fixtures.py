#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Pinned official WMA Pro finite modes tuples, actual ASF framing and scalar FFmpeg9 PCM."""
import pathlib,subprocess,json,hashlib,struct,urllib.request,urllib.parse
root=pathlib.Path('/tmp/demuxe-wma-modes-fixtures');root.mkdir(exist_ok=True)
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
SAMPLES={'Beethovens nionde symfoni (Scherzo)-1.wma': 'b2c7bef9c274f19d8ffe358af2c083b939bfe9d4a5565d2f64beecb6c3a17ea3', 'Classical_44_24_6_440000_1_20.wma': 'd8aa834c6fbba6216d0081cc2f083e77d09d45b0d990f686433856e414b000a2', 'Classical_96_24_6_256000_1_20.wma': 'abd5611dcc51d3c6fbe9f4dd144c1f5fa7ea57257d7b71f227b82b99e0012e99', 'classical_16_16_1_8000_off_0_off_1_29.wma': '841e8b2b552c80152f8eee7a6b8ddb2d731b23b01951bf217fc12b05c3d7efb0', 'classical_22_16_1_14000_v3c_0_extend_0_29.wma': '54c07fafacf0b9c1a99e5756243c285b2f7d2b44e12ee2ca8ea91f24772daafe', 'classical_22_16_2_16000_v3c_0_exclusive_0_29.wma': '7f8d90029b8f3e3378bd53f78037167b566a6bdaa1aeaba25f1ebc12e6add5e0'}
SAMPLES['New Stories (Highway Blues)-2.wma']='a3aacb561f34bf2974423fa2d78e7f7e7637a79b3a39da44dff942e196b1cf75'
rows=[];screened=[]
for name,digest in SAMPLES.items():
 source=root/name;url='https://samples.ffmpeg.org/A-codecs/WMA9/wmapro/'+urllib.parse.quote(name)
 if not source.exists():urllib.request.urlretrieve(url,source)
 assert sha(source)==digest
 ident=source.stem;fm=framing(source);assert fm['channels']in[1,2,6] and fm['bitsPerSample']in[16,24] and fm['sampleRate']in[16000,22050,44100,48000,96000]
 packet=root/(ident+'.packets.json');packet.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(source)]))
 frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples','-of','json',str(source)]))
 pcm=root/(ident+'.f32');subprocess.run([str(ref/'ffmpeg'),'-v','error','-xerror','-cpuflags','0','-y','-i',str(source),'-af','asetpts=N/SR/TB','-f','f32le',str(pcm)],check=True)
 if fm['sampleRate']==22050 and fm['channels']==2:
  screened.append(dict(id=ident,input=str(source),inputSHA256=sha(source),sourceURL=url,framing=fm,referenceSHA256=sha(pcm),status='screened-fixture-pending',reason='Whole scalar reference is coded silence; non-silent PCM qualification absent, finite public/native guard rejects this tuple.'));continue
 rows.append(dict(id=ident,profile='wma-advanced',codec='wmapro',sampleRate=fm['sampleRate'],channels=fm['channels'],bitsPerSample=fm['bitsPerSample'],input=str(source),inputSHA256=sha(source),sourceURL=url,packetSHA256=sha(packet),framesSHA256=sha(frames),referenceSHA256=sha(pcm),referenceSamples=pcm.stat().st_size//4//fm['channels'],framing=fm,generated=True))
browser=[]
for row in rows:
 p=root/(row['id']+'.f32');subprocess.run([str(ref/'ffmpeg'),'-v','error','-xerror','-cpuflags','0','-y','-i',row['input'],'-af','asetpts=N/SR/TB','-f','f32le',str(p)],check=True)
 (root/(row['id']+'.json')).write_bytes((root/(row['id']+'.packets.json')).read_bytes())
 browser.append(dict(row,fixtureRoot=str(root),referenceF32SHA256=sha(p),seekContract='restart-from-start-and-discard',packetFraming='one-original-complete-ASF-codec-block'))
(root/'packet-browser.json').write_text(json.dumps(browser,indent=2)+'\n')
(root/'screened.json').write_text(json.dumps(screened,indent=2)+'\n')
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'WMA Pro finite modes fixtures')
