#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Actual scalar pinned G.726 streams, explicit bit geometry and independent references."""
import argparse,hashlib,json,math,pathlib,struct,subprocess,urllib.request
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--reference',type=pathlib.Path,default=pathlib.Path('/tmp/demuxe-g726-reference-01'));p.add_argument('--out',type=pathlib.Path,default=pathlib.Path('/tmp/demuxe-g726-fixtures'));a=p.parse_args();root=a.out.resolve();root.mkdir(parents=True,exist_ok=True);reference=a.reference.resolve();record_path=reference/'build-record.json';record=json.loads(record_path.read_text());ff=reference/'build/ffmpeg';probe=reference/'build/ffprobe'
def digest(b):return hashlib.sha256(b).hexdigest()
assert record['source']['revision']=='n9.0.2'
for n in ['ffmpeg','ffprobe']:assert digest((reference/'build'/n).read_bytes())==record['artifacts'][n]['sha256']
def command(args):return subprocess.run([str(ff),'-v','error','-cpuflags','0','-y',*map(str,args)],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE).stdout
def raw_options(codec,bits):return ['-f','g726le' if codec=='adpcm-g726le' else 'g726','-code_size',bits,'-sample_rate',8000]
def decode(data,codec,bits,fmt='s32le'):
 return command([*raw_options(codec,bits),'-i',data,'-map','0:a:0','-f',fmt,'-'])
def codes(data,bits,little):
 result=[]
 for start in range(0,len(data)*8,bits):
  value=0
  for bit in range(bits):
   offset=start+bit;one=(data[offset//8]>>(offset%8 if little else 7-offset%8))&1
   value|=one<<bit if little else one<<(bits-1-bit)
  result.append(value)
 return result
samples=24008;source=b''.join(struct.pack('<h',round(18000*math.sin(i*.153)+9000*math.sin(i*.073))) for i in range(samples));sourcefile=root/'synthetic-source.s16';sourcefile.write_bytes(source);fixtures=[];controls=[];encoded={}

def fixture(id,codec,bits,media,source_metadata,container='raw-g726'):
 payload=media.read_bytes();raw=media
 if container=='wave-g726':
  chunks={};position=12;assert payload[:4]==b'RIFF' and payload[8:12]==b'WAVE' and struct.unpack_from('<I',payload,4)[0]+8==len(payload)
  while position+8<=len(payload):
   tag=payload[position:position+4].decode('ascii');size=struct.unpack_from('<I',payload,position+4)[0];assert position+8+size<=len(payload);chunks[tag]=(position+8,payload[position+8:position+8+size]);position+=8+size+(size&1)
  fmt=chunks['fmt '][1];tag,ch,rate,avg,align,width=struct.unpack_from('<HHIIHH',fmt);assert tag==0x45 and ch==1 and rate==8000 and avg*8==bits*8000
  raw=root/(id+'.payload');raw.write_bytes(chunks['data'][1]);fact=struct.unpack_from('<I',chunks['fact'][1])[0] if 'fact' in chunks else None
  source_metadata={**source_metadata,'waveFormatTag':tag,'waveBitsPerSample':width,'averageBytesPerSecond':avg,'blockAlign':align,'factSamples':fact,'dataOffset':chunks['data'][0]}
 data=raw.read_bytes();assert len(data)*8%bits==0,'Incomplete coded sample bit group';expected=len(data)*8//bits
 scalar=decode(raw,codec,bits);floating=decode(raw,codec,bits,'f32le');assert len(scalar)==expected*4==len(floating)
 if container=='wave-g726':
  assert command(['-i',media,'-map','0:a:0','-f','s32le','-'])==scalar,'WAV maps to a different explicit raw bit order or clock'
  assert source_metadata['factSamples']==expected,'WAV independent fact duration differs from complete coded geometry'
 for i in range(expected):assert struct.unpack_from('<f',floating,i*4)[0]==struct.unpack_from('<i',scalar,i*4)[0]/2147483648
 (root/(id+'.s32')).write_bytes(scalar);(root/(id+'.f32')).write_bytes(floating)
 packets=[];clock=0
 for offset in range(0,len(data),1020):
  block=data[offset:offset+1020];assert len(block)*8%bits==0;count=len(block)*8//bits
  lines=['%08x: %s'%(j,' '.join(block[j:j+16].hex()[k:k+4] for k in range(0,len(block[j:j+16].hex()),4))) for j in range(0,len(block),16)]
  packets.append({'data':'\n'+'\n'.join(lines)+'\n','pts':clock,'pts_time':str(clock/8000),'duration':count,'size':len(block),'pos':offset});clock+=count
 assert clock==expected
 metadata={'streams':[{'codec_name':'g726le' if codec=='adpcm-g726le' else 'g726','sample_rate':'8000','channels':1,'bits_per_sample':bits,'time_base':'1/8000','extradata':''}],'packets':packets,'packetClock':'explicit-source-sample-frames','originalScalarSamples':expected};json_bytes=(json.dumps(metadata,indent=2)+'\n').encode();(root/(id+'.json')).write_bytes(json_bytes)
 row={'id':id,'profile':'g726','codec':codec,'container':container,'sampleRate':8000,'channels':1,'bitsPerSample':bits,'bitRate':bits*8000,'bitOrder':'least-significant-first' if codec=='adpcm-g726le' else 'most-significant-first','input':str(media),'inputSHA256':digest(payload),'payloadSHA256':digest(data),'fixtureRoot':str(root),'referenceSamples':expected,'referenceSHA256':digest(scalar),'referenceF32SHA256':digest(floating),'packetSHA256':digest(json_bytes),'packetFraming':'complete-byte-and-code-groups','seekContract':'restart-from-start-and-discard','timestampOrigin':'source-sample-clock','generated':True,'originPackingQualified':source_metadata['kind']!='official-FFmpeg-sample-prefix','source':source_metadata};fixtures.append(row)
 # Predictor state: opening a decoder at a later complete packet must differ.
 offset=1020;tail=root/(id+'.tail');tail.write_bytes(data[offset:]);tail_pcm=decode(tail,codec,bits);assert tail_pcm!=scalar[offset*8//bits*4:],'Fixture does not exercise dependent predictor state'
 controls.append({'id':id,'restartTailDiffers':True,'tailOriginalSampleOffset':offset*8//bits,'tailPCMHash':digest(tail_pcm)})
 wrong=decode(raw,'adpcm-g726' if codec=='adpcm-g726le' else 'adpcm-g726le',bits);assert wrong!=scalar,'Fixture does not distinguish bit order';controls[-1]['wrongBitOrderDiffers']=True
 return row
for bits in [2,3,4,5]:
 for codec,name in [('adpcm-g726','g726'),('adpcm-g726le','g726le')]:
  id=name+'-'+str(bits)+'bit';media=root/(id+'.'+name);command(['-f','s16le','-ar',8000,'-ac',1,'-i',sourcefile,'-c:a',name,'-b:a',bits*8000,'-f',name,media]);assert len(media.read_bytes())==samples*bits//8;encoded[(bits,name)]=media.read_bytes();fixture(id,codec,bits,media,{'kind':'synthetic-source-s16','sha256':digest(source),'samples':samples})
 assert codes(encoded[(bits,'g726')],bits,False)==codes(encoded[(bits,'g726le')],bits,True),'Bit packing changed encoder code values'
 assert (root/('g726-'+str(bits)+'bit.s32')).read_bytes()==(root/('g726le-'+str(bits)+'bit.s32')).read_bytes(),'Equivalent code values decode differently'
 media=root/('g726-'+str(bits)+'bit.wav');command([*raw_options('adpcm-g726',bits),'-i',root/('g726-'+str(bits)+'bit.g726'),'-c:a','copy','-f','wav',media]);fixture('wave-g726-'+str(bits)+'bit','adpcm-g726',bits,media,{'kind':'packet-copy-of-synthetic-stream','rawSHA256':digest(encoded[(bits,'g726')])},'wave-g726')
url='https://samples.ffmpeg.org/A-codecs/g726/axis.726';pin='dae47006802b46cd8f3975a005d8039c99623d937ef3c0e986ee1fb50081ac97';official=root/'axis.726'
if not official.exists():official.write_bytes(urllib.request.urlopen(url,timeout=30).read())
full=official.read_bytes();assert digest(full)==pin and len(full)==202800
prefix=full[:12000];media=root/'axis-bounded.g726';media.write_bytes(prefix);fixture('axis-bounded','adpcm-g726',4,media,{'kind':'official-FFmpeg-sample-prefix','url':url,'fullSHA256':pin,'fullBytes':len(full),'prefixBytes':len(prefix),'descriptionURL':'https://samples.ffmpeg.org/A-codecs/g726/axis.txt','bitOrderAdmission':'explicit big-endian test configuration; sample description does not declare packing'})
# Official complete bytes are retained, no candidate is admitted by auto detection.
manifest={'schema':1,'referenceBuildSHA256':digest(record_path.read_bytes()),'referenceBinarySHA256':record['artifacts']['ffmpeg']['sha256'],'sourcePCMHash':digest(source),'fixtures':fixtures,'controls':controls,'scope':'8k mono finite G726 code widths2..5, explicit raw packing and canonical big-endian WAV only; no provider registration/browser claim'};(root/'fixtures.json').write_text(json.dumps(manifest,indent=2)+'\n');print(root/'fixtures.json')

# Installed qualification receives only encoder-owned packing; archived Axis is screened separately.
import shutil
packet_rows=[];composition_rows=[]
for f in fixtures:
 if not f['originPackingQualified']:continue
 composition_rows.append({**f,'encodings':['flac']})
 id='g726-packet-'+f['id'];extension=pathlib.Path(f['input']).suffix
 for suffix in ['.json','.s32','.f32']:
  shutil.copyfile(root/(f['id']+suffix),root/(id+suffix))
 shutil.copyfile(f['input'],root/(id+extension));packet_rows.append({**f,'id':id,'input':str(root/(id+extension))})
(root/'packet-fixtures.json').write_text(json.dumps(packet_rows,indent=2)+'\n');(root/'browser-fixtures.json').write_text(json.dumps(composition_rows,indent=2)+'\n')
