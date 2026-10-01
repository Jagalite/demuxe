#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Portable supplemental ADPCM inputs; native padded PCM and fact output refs differ explicitly."""
import hashlib,json,pathlib,struct,os
root=pathlib.Path('/tmp/demuxe-adpcm-wave-fixtures');out=pathlib.Path('/tmp/demuxe-adpcm-wave-browser-fixtures');out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def hex_dump(data):return '\n'+''.join(f'{i:08x}: '+data[i:i+16].hex(' ')+'  .\n' for i in range(0,len(data),16))
def link(src,dst):
 if dst.exists():
  if os.path.samefile(src,dst):return
  dst.unlink()
 os.link(src,dst)
packets=[];compositions=[]
for f in json.loads((root/'fixtures.json').read_text()):
 source=pathlib.Path(f['input']);data=source.read_bytes();assert sha(data)==f['inputSHA256'];id='adpcm-wave-packet-'+f['id'];fmt=f['offsets']['fmt'];extra=data[fmt+18:fmt+18+struct.unpack_from('<H',data,fmt+16)[0]];count=f['decodedSamples']//f['samplesPerBlock'];align=f['blockAlign'];start=f['offsets']['data']
 packet={'streams':[{'codec_name':f['codec'].replace('-','_'),'sample_rate':str(f['sampleRate']),'channels':f['channels'],'bits_per_coded_sample':4,'extradata':hex_dump(extra)}],'packets':[{'data':hex_dump(data[start+i*align:start+(i+1)*align]),'pts_time':str(i*f['samplesPerBlock']/f['sampleRate']),'duration_time':str(f['samplesPerBlock']/f['sampleRate'])} for i in range(count)]}
 packet_raw=(json.dumps(packet,separators=(',',':'))+'\n').encode();(out/(id+'.json')).write_bytes(packet_raw);link(source,out/(id+'.wav'))
 padded=(root/(f['id']+'.padded.s32')).read_bytes();assert sha(padded)==f['paddedReferenceSHA256'];floats=b''.join(struct.pack('<f',sample[0]/2147483648)for sample in struct.iter_unpack('<i',padded));(out/(id+'.s32')).write_bytes(padded);(out/(id+'.f32')).write_bytes(floats)
 packets.append({**f,'id':id,'input':str(out/(id+'.wav')),'fixtureRoot':str(out),'packetSHA256':sha(packet_raw),'referenceSHA256':sha(padded),'referenceF32SHA256':sha(floats),'referenceSamples':f['decodedSamples'],'presentationSamples':f['referenceSamples'],'packetFraming':'one-original-complete-WAV-block','sourceFixtureId':f['id']})
 if f['sampleRate'] in [8000,16000,22050,32000,44100,48000]:
  id='adpcm-wave-composition-'+f['id']+'-flac';link(source,out/(id+'.wav'));link(root/(f['id']+'.s32'),out/(id+'.s32'));link(root/(f['id']+'.f32'),out/(id+'.f32'));compositions.append({**f,'id':id,'input':str(out/(id+'.wav')),'fixtureRoot':str(out),'container':'adpcm-wave','audioOnly':True,'output':'flac','expectedRejection':None})
(out/'packets.json').write_text(json.dumps(packets,indent=2)+'\n');(out/'compositions.json').write_text(json.dumps(compositions,indent=2)+'\n');print(len(packets),'packet rows;',len(compositions),'original-fact composition rows')
