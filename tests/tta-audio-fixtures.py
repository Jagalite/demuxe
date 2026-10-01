#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""TTA1 packets: pinned real sample plus finite host-encoded integer cases."""
import pathlib,json,subprocess,hashlib,os,shutil,urllib.request
root=pathlib.Path(os.environ.get('TTA_AUDIO_FIXTURE_ROOT','/tmp/demuxe-tta-fixtures'));root.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
def register(ident,p,url=None,rejected=False,budget=False):
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_data','-of','json',str(p)]));stream=data['streams'][0];packet=root/(ident+'.json');packet.write_text(json.dumps(data))
 reference=root/(ident+'.s32');subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-i',str(p),'-map','0:a:0','-f','s32le',str(reference)],check=True)
 float_reference=root/(ident+'.f32');subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-i',str(p),'-map','0:a:0','-f','f32le',str(float_reference)],check=True)
 frames=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_frames','-show_entries','frame=pts_time,nb_samples,sample_fmt,channel_layout','-of','json',str(p)]));frame_path=root/(ident+'.frames.json');frame_path.write_text(json.dumps(frames))
 rows.append(dict(id=ident,profile='archive-more',codec='tta',sampleRate=int(stream['sample_rate']),channels=stream['channels'],bitsPerSample=int(stream['bits_per_raw_sample']),input=str(p),inputSHA256=sha(p),packetSHA256=sha(packet),referenceSHA256=sha(reference),referenceF32SHA256=sha(float_reference),framesSHA256=sha(frame_path),sourceURL=url,expectedDecodeRejection='packet-budget' if budget else None,expectedRejection='PROVIDER_PROFILE_MISMATCH' if rejected else None))
url='https://samples.ffmpeg.org/A-codecs/lossless/luckynight.tta';canonical=root/'tta-canonical.tta';digest='8bc3603af61b7a059e064aaca0b93bb5ef43e5a61f249f886bf9cbea3b73a953';local=pathlib.Path('/tmp/demuxe-archive-next-inventory/luckynight.tta')
if not canonical.exists():
 if local.exists():shutil.copyfile(local,canonical)
 elif os.environ.get('TTA_FETCH_CANONICAL')=='1':
  with urllib.request.urlopen(url,timeout=60) as response:canonical.write_bytes(response.read())
 else:raise ValueError('Canonical TTA missing; set TTA_FETCH_CANONICAL=1')
assert sha(canonical)==digest;register('tta-canonical',canonical,url)
for bits in [16,24]:
 for rate in [44100,48000]:
  for channels in [1,2,6]:
   ident=f'tta{bits}-{rate}-{channels}';p=root/(ident+'.tta');wave='|'.join(f'0.09*sin(2*PI*{337+131*c}*t)*if(between(t,2.0,2.37)+between(t,4.1,4.31),0.0001,1)' for c in range(channels)).replace(',',chr(92)+',')
   subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={wave}:s={rate}:d=6.137','-c:a','tta','-sample_fmt','s16' if bits==16 else 's32','-bits_per_raw_sample',str(bits),str(p)],check=True);
   if bits==24 and channels==6:
    register(ident+'-quiet-overbudget',p,budget=True)
    smooth=root/(ident+'-smooth.tta');signal='|'.join(f'0.09*sin(2*PI*{337+131*c}*t)' for c in range(channels));subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={signal}:s={rate}:d=6.137','-c:a','tta','-sample_fmt','s32','-bits_per_raw_sample','24',str(smooth)],check=True);register(ident+'-smooth',smooth)
   else:register(ident,p)
for rate,channels in [(96000,2),(48000,8)]:
 ident=f'tta24-{rate}-{channels}-unsupported';p=root/(ident+'.tta');wave='|'.join(f'0.09*sin(2*PI*{337+131*c}*t)' for c in range(channels));subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={wave}:s={rate}:d=6.137','-c:a','tta','-sample_fmt','s32','-bits_per_raw_sample','24',str(p)],check=True);register(ident,p,rejected=True)
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'TTA packet fixtures')
