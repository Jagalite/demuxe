#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Longer, finite audio packet qualification; generated media stays in build/."""
import json, pathlib, subprocess, hashlib, os
root=pathlib.Path(os.environ.get('AUDIO_COVERAGE_ROOT','build/codec-expansion/audio-coverage'));root.mkdir(parents=True,exist_ok=True)
cases=[('aac','aac','aac',16),('opus-vorbis','opus','libopus',16),('opus-vorbis','vorbis','vorbis',16),('lossless','flac24','flac',24),('lossless','alac','alac',24),('mp3','mp3','libmp3lame',16)]+[('pcm','pcm-'+n.replace('_','-'),'pcm_'+n,b) for n,b in [('s16le',16),('s24le',24),('s32le',32),('f32le',32),('f64le',64)]]
results=[]
selected=set(filter(None,os.environ.get('FIXTURE_CODECS','').split(',')))
for profile,name,encoder,bits in cases:
 if selected and name not in selected: continue
 layouts=[(44100,1),(44100,2),(48000,6),(48000,8)]
 if name=='opus':layouts=[(48000,1),(48000,2),(48000,6),(48000,8)]
 if name=='mp3':layouts=[(44100,1),(44100,2)]
 if os.environ.get('AUDIO_COVERAGE_LAYOUTS'):layouts=[tuple(map(int,x.split('-'))) for x in os.environ['AUDIO_COVERAGE_LAYOUTS'].split(',')]
 for rate,channels in layouts:
  ident=f'{name}-{rate}-{channels}';extension='mov' if name in ['alac','pcm-f64le'] else 'mkv';out=root/(ident+'.'+extension)
  standalone=os.environ.get('AUDIO_COVERAGE_STANDALONE')=='1'
  if standalone and name in ['mp3','aac']:
   extension='mp3' if name=='mp3' else 'm4a';ident+='-'+extension;out=root/(ident+'.'+extension)
  # Distinct channel signals, two quiet intervals, and a non-frame-aligned tail.
  duration=6.137
  wave='|'.join(f'0.09*sin(2*PI*{277+131*c}*t)*if(between(t,1.35,1.45)+between(t,3.15,3.25),0,1)' for c in range(channels))
  command=['ffmpeg','-v','error','-y','-f','lavfi','-i',f'testsrc2=size=96x64:rate=25:duration={duration}','-f','lavfi','-i',f'aevalsrc={wave.replace(chr(44),chr(92)+chr(44))}:s={rate}:d={duration}','-c:v','libx264','-bf',os.environ.get('AUDIO_COVERAGE_BFRAMES','2'),'-g','25','-preset','ultrafast','-strict','-2','-c:a',encoder,'-ac',str(channels),'-ar',str(rate)]
  if name=='flac24':command+=['-sample_fmt','s32','-bits_per_raw_sample','24']
  if name=='opus':command+=['-mapping_family','1' if channels>2 else '0']
  if name=='vorbis':command+=['-q:a','5']
  if standalone and name in ['mp3','aac']:command+=['-vn']
  command+=['-f','mp3' if extension=='mp3' else 'mov' if extension in ['mov','m4a'] else 'matroska',str(out)]
  generated=subprocess.run(command,capture_output=True,text=True)
  if generated.returncode:
   results.append(dict(id=ident,profile=profile,codec=name,sampleRate=rate,channels=channels,generated=False,generationError=generated.stderr.strip()))
   print(ident,'GENERATION BLOCKED',generated.stderr.strip().splitlines()[0]);continue
  data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_data','-of','json',str(out)]))
  (root/(ident+'.json')).write_text(json.dumps(data))
  for format in ['f32le']+(['s32le'] if profile in ['lossless','pcm'] else [])+(['f64le'] if name=='pcm-f64le' else []):
   suffix={'f32le':'f32','s32le':'s32','f64le':'f64'}[format]
   subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-i',str(out),'-map','0:a:0','-f',format,str(root/(ident+'.'+suffix))],check=True)
  stream=data['streams'][0]
  results.append(dict(id=ident,profile=profile,codec='flac' if name=='flac24' else name,sampleRate=rate,channels=channels,bitsPerSample=int(stream.get('bits_per_raw_sample') or stream.get('bits_per_sample') or bits),input=str(out),duration=duration,generated=True,inputSHA256=hashlib.sha256(out.read_bytes()).hexdigest(),packetSHA256=hashlib.sha256((root/(ident+'.json')).read_bytes()).hexdigest()))
if (selected or os.environ.get('AUDIO_COVERAGE_LAYOUTS')) and (root/'fixtures.json').exists():
 ids={f['id'] for f in results};results=[f for f in json.loads((root/'fixtures.json').read_text()) if f['id'] not in ids]+results
(root/'fixtures.json').write_text(json.dumps(results,indent=2)+'\n')
print(f'{len(results)} extended fixtures: {root}')
