#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Bounded whole-block derivations; preserve original packet clocks explicitly."""
import pathlib,json,struct,subprocess,hashlib,os
source=pathlib.Path(os.environ.get('WMA_ADVANCED_FIXTURE_ROOT','/tmp/demuxe-wma-advanced-fixtures'));out=pathlib.Path(os.environ.get('WMA_ADVANCED_BROWSER_ROOT','/tmp/demuxe-wma-advanced-browser-fixtures'));out.mkdir(parents=True,exist_ok=True)
ffmpeg=os.environ.get('WMA_REFERENCE_FFMPEG','/tmp/demuxe-wma-native-reference/ffmpeg');ffprobe=os.environ.get('WMA_REFERENCE_FFPROBE','/tmp/demuxe-wma-native-reference/ffprobe')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def unhex(s):return bytes.fromhex(''.join(line.split(':')[1].split('  ')[0].replace(' ','') for line in s.splitlines() if ':' in line))
rows=[]
for f in json.loads((source/'fixtures.json').read_text()):
 assert sha(source/(f['id']+'.packets.json'))==f['packetSHA256'];full=json.loads((source/(f['id']+'.packets.json')).read_text());packets=full['packets'];count=next((i for i,p in enumerate(packets) if float(p['pts_time'])>=2.5),len(packets));count=max(1,count);selected=packets[:count];payload=b''.join(unhex(p['data']) for p in selected);fmt=bytes.fromhex(f['framing']['waveFormatHex']);body=b'WAVE'+b'fmt '+struct.pack('<I',len(fmt))+fmt+(b'\0' if len(fmt)%2 else b'')+b'data'+struct.pack('<I',len(payload))+payload+(b'\0' if len(payload)%2 else b'')
 ident='wma-advanced-bounded-'+f['id'];media=out/(ident+'.wav');media.write_bytes(b'RIFF'+struct.pack('<I',len(body))+body)
 metadata=json.loads(subprocess.check_output([ffprobe,'-v','error','-show_streams','-show_packets','-show_data','-of','json',str(media)]));assert len(metadata['packets'])==len(selected)
 for original,derived in zip(selected,metadata['packets']):
  assert unhex(original['data'])==unhex(derived['data']);derived['pts_time']=original['pts_time'];derived['pts']=original['pts'];derived['original_asf_time_base']=full['streams'][0]['time_base']
 packetfile=out/(ident+'.json');packetfile.write_text(json.dumps(metadata))
 reference=out/(ident+'.f32');r=subprocess.run([ffmpeg,'-v','error','-cpuflags','0','-err_detect','explode','-y','-i',str(media),'-map','0:a:0','-af','asetpts=N/SR/TB','-f','f32le',str(reference)],capture_output=True);unsupported=b'Not yet implemented' in r.stderr;assert r.returncode==0 or unsupported,r.stderr.decode();assert not r.stderr or unsupported,r.stderr.decode()
 row={**f,'id':ident,'input':str(media),'fixtureRoot':str(out),'inputSHA256':sha(media),'packetSHA256':sha(packetfile),'sourceInputSHA256':f['inputSHA256'],'sourcePacketSHA256':f['packetSHA256'],'sourceFixture':f['id'],'sourceWholePacketPrefixCount':count,'timestampMetadata':'Original ASF packet clock retained; PCM reference independently decodes the exact complete block prefix in WAVEFORMATEX. No original-timeline seek qualification.','referenceSamples':reference.stat().st_size//4//f['channels'],'referenceF32SHA256':sha(reference)}
 row.pop('expectedFailure',None);row.pop('framesSHA256',None)
 if unsupported:
  row.update(expectedDecodeRejection='unsupported-feature',expectedMessage='Audio codec failed (-1163346256)');row.pop('referenceSHA256',None)
 elif f['codec']=='wmalossless':
  integer=out/(ident+'.s32');subprocess.run([ffmpeg,'-v','error','-cpuflags','0','-y','-i',str(media),'-map','0:a:0','-af','asetpts=N/SR/TB','-f','s32le',str(integer)],check=True);row['referenceSHA256']=sha(integer)
 else:row.pop('referenceSHA256',None)
 if f['codec']=='wmavoice' and not unsupported:row['floatQualification']={'maxAbsoluteError':.01,'minimumSNR':65,'mandatorySilentControl':True,'mandatoryCorruptControl':True}
 rows.append(row)
(out/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'bounded WMA packet fixtures',out)
