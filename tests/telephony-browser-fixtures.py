#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Adapt proved native telephony inputs to installed packet/schema manifests."""
import json,pathlib,hashlib,os
root=pathlib.Path('/tmp/demuxe-telephony-fixtures');out=pathlib.Path('/tmp/demuxe-telephony-browser-fixtures');out.mkdir(exist_ok=True)
sha=lambda b:hashlib.sha256(b).hexdigest()
def link(src,dst):
 if dst.exists():
  if os.path.samefile(src,dst):return
  dst.unlink()
 os.link(src,dst)
def dump(b):return '\n'+''.join(f'{i:08x}: '+b[i:i+16].hex(' ')+'  .\n'for i in range(0,len(b),16))
packets=[];compositions=[]
for f in json.loads((root/'packet-browser.json').read_text()):
 id='telephony-packet-'+f['id'];raw=(root/(f['id']+'.json')).read_bytes();assert sha(raw)==f['packetSHA256'];data=json.loads(raw);data['streams']=[{'codec_name':f['codec'].replace('-','_'),'sample_rate':str(f['sampleRate']),'channels':f['channels'],'bits_per_coded_sample':f['bitsPerSample'],'extradata':dump(bytes.fromhex(f['extradata']))}];encoded=(json.dumps(data,separators=(',',':'))+'\n').encode();(out/(id+'.json')).write_bytes(encoded);source=pathlib.Path(f['input']);assert sha(source.read_bytes())==f['inputSHA256'];link(source,out/(id+source.suffix))
 for ext,key in [('.s32','referenceSHA256'),('.f32','referenceF32SHA256')]:
  original=root/(f['id']+ext);assert sha(original.read_bytes())==f[key];link(original,out/(id+ext))
 packets.append({**f,'id':id,'fixtureRoot':str(out),'input':str(out/(id+source.suffix)),'sourceFixtureId':f['id'],'sourcePacketSHA256':f['packetSHA256'],'packetSHA256':sha(encoded)})
for f in json.loads((root/'composition-browser.json').read_text()):
 id='telephony-composition-'+f['id'];source=pathlib.Path(f['input']);assert sha(source.read_bytes())==f['inputSHA256'];link(source,out/(id+source.suffix))
 for ext,key in [('.s32','referenceSHA256'),('.f32','referenceF32SHA256')]:
  original=root/(f['id']+ext);assert sha(original.read_bytes())==f[key];link(original,out/(id+ext))
 compositions.append({**f,'id':id,'fixtureRoot':str(out),'input':str(out/(id+source.suffix)),'sourceFixtureId':f['id'],'sourceContainer':f['container'],'container':'telephony','output':'flac'})
(out/'packets.json').write_text(json.dumps(packets,indent=2)+'\n');(out/'compositions.json').write_text(json.dumps(compositions,indent=2)+'\n');print(len(packets),'packet rows;',len(compositions),'composition rows')
