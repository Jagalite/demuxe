#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Independent real APE/WavPack samples and finite generated integer WavPack."""
import pathlib, subprocess, json, hashlib, os, urllib.request, shutil
root=pathlib.Path(os.environ.get('ARCHIVE_AUDIO_FIXTURE_ROOT','/tmp/demuxe-archive-audio-fixtures'));root.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
rows=[]
def register(ident,path,codec,source_url=None,expected_rejection=None):
 data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_data','-of','json',str(path)]));stream=data['streams'][0]
 (root/(ident+'.json')).write_text(json.dumps(data))
 for fmt,suffix in [('f32le','f32'),('s32le','s32')]:
  subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-i',str(path),'-map','0:a:0','-f',fmt,str(root/(ident+'.'+suffix))],check=True)
 rows.append(dict(id=ident,profile='archive',codec=codec,sampleRate=int(stream['sample_rate']),channels=stream['channels'],bitsPerSample=int(stream.get('bits_per_raw_sample') or stream.get('bits_per_sample') or 32),input=str(path),inputSHA256=sha(path),packetSHA256=sha(root/(ident+'.json')),referenceSHA256=sha(root/(ident+'.s32')),sourceURL=source_url,expectedRejection=expected_rejection))
for codec,extension,digest in [('ape','ape','6a7b79a6d530e9847c18119d627bd43c8d27dcefb3ec7ec979b9b6306e34ac15'),('wavpack','wv','e94c946cbad31706815ce55426a8b60a9c16ba8827d3aa69854192903b7a1645')]:
 path=root/(codec+'-canonical.'+extension);local=pathlib.Path('/tmp/demuxe-luckynight.'+extension);url='https://samples.ffmpeg.org/A-codecs/lossless/luckynight.'+extension
 if not path.exists():
  if local.exists():shutil.copyfile(local,path)
  elif os.environ.get('ARCHIVE_FETCH_CANONICAL')=='1':
   with urllib.request.urlopen(url,timeout=60) as response:path.write_bytes(response.read())
  else:raise ValueError('Missing pinned canonical fixture; set ARCHIVE_FETCH_CANONICAL=1')
 assert sha(path)==digest,'Canonical archive source changed';register(codec+'-canonical',path,codec,url)
for bits in [16,24,32]:
 for rate,channels in [(44100,1),(44100,2),(48000,1),(48000,2),(48000,6),(48000,8),(96000,1),(96000,2),(96000,6),(96000,8)]:
  ident=f'wavpack{bits}-{rate}-{channels}';path=root/(ident+'.wv');wave='|'.join(f'0.09*sin(2*PI*{337+131*c}*t)' for c in range(channels))
  subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={wave}:s={rate}:d=6.137','-c:a','wavpack','-sample_fmt','s16p' if bits==16 else 's32p','-bits_per_raw_sample',str(bits),str(path)],check=True);register(ident,path,'wavpack')
path=root/'wavpack-float-48000-2.wv'
subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','aevalsrc=0.1*sin(2*PI*337*t)|0.09*sin(2*PI*571*t):s=48000:d=0.137','-c:a','wavpack','-sample_fmt','fltp',str(path)],check=True);register('wavpack-float-48000-2',path,'wavpack',expected_rejection='PROVIDER_PROFILE_MISMATCH')
(root/'fixtures.json').write_text(json.dumps(rows,indent=2)+'\n');print(len(rows),'archive fixtures',root)
