#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""All ordinary official AMR modes and exact aligned variable-mode packets."""
import pathlib,urllib.request,subprocess,json,hashlib,os
root=pathlib.Path(os.environ.get('AMR_MODE_FIXTURE_ROOT','/tmp/demuxe-amr-modes-fixtures'));root.mkdir(exist_ok=True)
ref=pathlib.Path(os.environ.get('SPEECH_REFERENCE_ROOT','/tmp/demuxe-speech-native-reference'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
record=json.loads((ref/'build-record.json').read_text())
for name in ['ffmpeg','ffprobe']:assert sha(ref/name)==record['artifacts'][name]['sha256']
PINS={'amrnb-mode5.official': '214c78192c60a423af4cbb0378e8709b63c814e2c6f28b4ad85d4e74f321f96b', 'amrnb-mode4.official': 'eb0735ab6f38d67001381b36a0cd20ac2b8179e0042fb8b5ec96cb050ba29ced', 'amrwb-mode7.official': '9161cb45bbd3d682ea0d8c8fd0cb4f90c57ed5ee17d882dcc03d8b856b645015', 'amrwb-mode6.official': '36ddfeb4eec6e6e54f97e6707f1a7e309835f206d34a3fc58b5d1d296f0c4e26', 'amrnb-mode2.official': '79984bc62891ae54a6a585746b90382de937b704fe3d09297e6d9f07be6f2c96', 'amrnb-mode3.official': '0bc81e7f158b24e8aec7bbdbf19d1ceef82f41025b8f310fe6bb5a0a92fb22a2', 'amrwb-mode0.official': '5cd9696ce3b0df137c5c53f02392c3a9ee2ef0a614908d12f93c33fefa21b92f', 'amrwb-mode1.official': '7a6709e789e5f5f955134aacab8808b1dd761a6b872e1d867016958fd65151ea', 'amrnb-mode6.official': 'c0a44045e679d2575222928b1ad6d4b1fafeafdebe6ce812f7b8eb605f8f87ca', 'amrnb-mode7.official': '34445340325350fb5f4e15893c7b1e6bfd3a6f87cd5dc8fc95989f2c3e8164fc', 'amrwb-mode4.official': 'e24ea4534c4654fd3302620c592a1408e8f48877d352823b0ee52e0b4940c6bb', 'amrwb-mode5.official': 'de98f20055969d8302418347c9b5e2e7d0179a15aef8774176c4bd984461fc3c', 'amrwb-mode8.official': '259a46a93139ea8e80d18acd53798dd4d1bd4c7cb66965e93a853862343a1381', 'amrnb-mode1.official': 'fcc84b701ffed6662c7d1956fb07b941bd838a224d2cfa9ddf94e613116f9f6e', 'amrnb-mode0.official': '02f83e3d2cf78d9224e57d2441e521f8063eeea5d92de67b4e574e6b3f229973', 'amrwb-mode3.official': '263d66604bc7fb81451ce22688d5503bb47ec5729e6eb14546d9bf5f937570f8', 'amrwb-mode2.official': 'c7900726fea05cf439a913d13d1f185885758796b8ed90ab5d629e040d0a5d9d'}
nb=['4.75k','5.15k','5.9k','6.7k','7.4k','7.95k','10.2k','12.2k'];wb=['6k60','8k85','12k65','14k25','15k85','18k25','19k85','23k05','23k85'];rows=[]
def unhex(s):return bytes.fromhex(''.join(l.split(':')[1].split('  ')[0].replace(' ','')for l in s.splitlines()if ':'in l))
def make(codec,mode,source,origin,url,modes):
 ident=source.stem;rate=8000 if codec=='amrnb'else 16000
 packet=root/(ident+'.json');packet.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(source)]));data=json.loads(packet.read_bytes());packets=data['packets'];assert all(round(float(p['pts_time'])*rate)==i*(160 if codec=='amrnb'else 320)for i,p in enumerate(packets));assert set(unhex(p['data'])[0]>>3 for p in packets)==set(modes)
 frames=root/(ident+'.frames.json');frames.write_bytes(subprocess.check_output([str(ref/'ffprobe'),'-v','error','-show_frames','-show_entries','frame=pts_time,nb_samples','-of','json',str(source)]))
 pcm=root/(ident+'.f32');subprocess.run([str(ref/'ffmpeg'),'-v','error','-xerror','-cpuflags','0','-c:a',codec,'-y','-i',str(source),'-f','f32le',str(pcm)],check=True)
 rows.append(dict(id=ident,codec=codec,profile='speech',sampleRate=rate,channels=1,bitsPerSample=0,amrModes=modes,input=str(source),inputSHA256=sha(source),sourceURL=url,originSHA256=sha(origin),packetSHA256=sha(packet),framesSHA256=sha(frames),referenceF32SHA256=sha(pcm),referenceSamples=pcm.stat().st_size//4,timestampGaps=[]))
for codec,names in [('amrnb',nb),('amrwb',wb)]:
 for mode,name in enumerate(names):
  filename=name+'.amr'if codec=='amrnb'else'seed-'+name+'.awb';url='https://fate-suite.ffmpeg.org/'+codec+'/'+filename;origin=root/(codec+'-mode'+str(mode)+'.official');
  if not origin.exists():urllib.request.urlretrieve(url,origin)
  assert sha(origin)==PINS[origin.name], 'Official AMR source hash mismatch'
  source=root/(codec+'-mode'+str(mode)+'.amr');
  if codec=='amrnb':source.write_bytes(origin.read_bytes())
  else:
   probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data','-of','json',str(origin)]));(root/(source.stem+'.origin.json')).write_text(json.dumps(probe,indent=2)+'\n');source.write_bytes(b'#!AMR-WB\n'+b''.join(unhex(p['data'])for p in probe['packets']))
  make(codec,mode,source,origin,url,[mode])
 # Preserve exact canonical packet bytes in a genuinely variable-mode stream.
 fixed=[json.loads((root/(codec+'-mode'+str(mode)+'.json')).read_bytes())['packets']for mode in range(len(names))];source=root/(codec+'-switch.amr');source.write_bytes((b'#!AMR\n'if codec=='amrnb'else b'#!AMR-WB\n')+b''.join(unhex(fixed[i%len(names)][i]['data'])for i in range(180)))
 make(codec,None,source,source,'Exact aligned canonical packets cycled from all pinned fixed-mode streams',list(range(len(names))))
for row in rows:
 if row['id'].endswith('-switch'):
  row['derivation']={'contract':'Exact original complete packets; one packet per original temporal index, modes cycled. New intentional mode-switch test stream, not an original container timeline.','sourceInputs':[{'id':f['id'],'inputSHA256':f['inputSHA256'],'originSHA256':f['originSHA256'],'sourceURL':f['sourceURL']}for f in rows if f['codec']==row['codec'] and not f['id'].endswith('-switch')]}
(root/'packet-browser.json').write_text(json.dumps([{**row,'generated':True,'fixtureOrigin':'official' if not row['id'].endswith('-switch') else 'derived-official-packets','fixtureRoot':str(root),'modeProfile':'ordinary-modes-float','seekContract':'restart-from-start-and-discard','speechFloatQualification':{'maxAbsoluteError':1e-4,'minimumSNR':80,'mandatorySilentControl':True,'mandatoryCorruptControl':True}}for row in rows],indent=2)+'\n')
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'ready')
