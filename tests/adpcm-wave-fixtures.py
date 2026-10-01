#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Whole original ADPCM codec blocks and independently declared fact-clipped PCM."""
import pathlib,json,struct,subprocess,hashlib,os
root=pathlib.Path(os.environ.get('ADPCM_WAVE_FIXTURE_ROOT','/tmp/demuxe-adpcm-wave-fixtures'));root.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
inventory=json.loads(pathlib.Path('results/media-components/codec-expansion/speech-adpcm-aac-inventory.json').read_text());inputs=[]
for f in inventory['realFixtures']:
 if f['id'] not in ['ms-adpcm','ima-wav']:continue
 p=pathlib.Path(f['path']);assert sha(p)==f['sha256'];inputs.append((f['id'],p,dict(sourceURL=f['url'],originSHA256=f['sha256'])))
for codec in ['adpcm_ms','adpcm_ima_wav']:
 for rate in [8000,16000,22050,32000,44100,48000]:
  for channels in [1,2]:
   ident=f'{codec}-{rate}-{channels}';p=root/(ident+'.wav');wave='|'.join(f'.12*sin(2*PI*{301+181*c}*t)' for c in range(channels));subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={wave}:s={rate}:d=2.137','-af',f'atrim=end_sample={int(rate*2.137)}','-c:a',codec,str(p)],check=True);inputs.append((ident,p,dict(generated=True,inputSamples=int(rate*2.137))))
rows=[]
for ident,source,origin in inputs:
 media=root/(ident+'.wav')
 if media!=source:media.write_bytes(source.read_bytes())
 blob=media.read_bytes();position=12;chunks=[]
 while position<len(blob):
  tag=blob[position:position+4].decode('ascii');n=struct.unpack_from('<I',blob,position+4)[0];chunks.append((tag,position+8,n));position+=8+n+(n&1)
 fmt=next((p,n)for tag,p,n in chunks if tag=='fmt ');fact=next((p,n)for tag,p,n in chunks if tag=='fact');data=next((p,n)for tag,p,n in chunks if tag=='data');assert fact[1]==4
 tag,channels,rate,average,align,bits,extra_size=struct.unpack_from('<HHIIHHH',blob,fmt[0]);samples=struct.unpack_from('<H',blob,fmt[0]+18)[0];declared=struct.unpack_from('<I',blob,fact[0])[0];assert data[1]%align==0
 # Locally generated files declare the independently counted input extent rather than codec padding.
 if origin.get('generated'):
  input_count=int(rate*2.137);assert (data[1]//align-1)*samples<input_count<=data[1]//align*samples
  changed=bytearray(blob);struct.pack_into('<I',changed,fact[0],input_count);media.write_bytes(changed);blob=bytes(changed);declared=input_count
 full=root/(ident+'.padded.s32');subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-i',str(media),'-map','0:a:0','-f','s32le',str(full)],check=True);assert full.stat().st_size//4//channels==data[1]//align*samples
 reference=root/(ident+'.s32');reference.write_bytes(full.read_bytes()[:declared*channels*4]);floatref=root/(ident+'.f32');floatref.write_bytes(b''.join(struct.pack('<f',sample/2147483648)for(sample,)in struct.iter_unpack('<i',reference.read_bytes())))
 oracle=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(media)]));(root/(ident+'.host.json')).write_text(json.dumps(oracle))
 payload=b''.join(bytes.fromhex(''.join(line.split(':')[1].split('  ')[0].replace(' ','')for line in p['data'].splitlines()if ':'in line))for p in oracle['packets']);assert payload==blob[data[0]:data[0]+data[1]]
 rows.append(dict(id=ident,profile='adpcm-wave',codec='adpcm-ms'if tag==2 else'adpcm-ima-wav',sampleRate=rate,channels=channels,bitsPerSample=bits,input=str(media),fixtureRoot=str(root),inputSHA256=sha(media),referenceSHA256=sha(reference),referenceF32SHA256=sha(floatref),paddedReferenceSHA256=sha(full),hostPacketSHA256=sha(root/(ident+'.host.json')),referenceSamples=declared,decodedSamples=data[1]//align*samples,blockAlign=align,samplesPerBlock=samples,framing=dict(blockAlign=align,bitRate=average*8),offsets=dict(fmt=fmt[0],fact=fact[0],data=data[0]),**origin))
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'ADPCM independent host fixtures',root)
