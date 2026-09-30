#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Generate deterministic packet decoder fixtures; media remains in build/."""
import json, pathlib, subprocess, os
root=pathlib.Path('build/codec-expansion/decoder-fixtures');root.mkdir(parents=True,exist_ok=True)
cases=[('aac','aac','aac',16),('opus-vorbis','opus','libopus',16),('opus-vorbis','vorbis','vorbis',16),('lossless','flac','flac',32),('lossless','flac24','flac',24),('lossless','alac','alac',24),('mp3','mp3','libmp3lame',16)]+[('pcm','pcm-'+n.replace('_','-'),'pcm_'+n,b) for n,b in [('s16le',16),('s24le',24),('s32le',32),('f32le',32),('f64le',64)]]
results=[]
selected=set(filter(None,os.environ.get("FIXTURE_CODECS", "").split(",")))
for profile,codec,encoder,bits in cases:
 if selected and codec not in selected: continue
 for rate,channels in [(48000,2),(48000,1),(44100,2)] if codec!='opus' else [(48000,2),(48000,1)]:
  if codec=='vorbis' and channels==1: continue
  ident=f'{codec}-{rate}-{channels}';out=root/(ident+'.mkv');container='matroska'
  # ALAC and float64 PCM require MOV; packets still exercise the same decoder ABI.
  if codec in ['alac','pcm-f64le']: out=root/(ident+'.mov');container='mov'
  subprocess.run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=64x64:rate=25:duration=0.32','-f','lavfi','-i',f'aevalsrc=0.15*sin(2*PI*431*t)'+('|0.12*sin(2*PI*719*t)' if channels==2 else '')+f':s={rate}:d=0.32','-c:v','libx264','-bf','0','-preset','ultrafast','-strict','-2','-c:a',encoder,*(['-sample_fmt','s32','-bits_per_raw_sample','24'] if codec=='flac24' else []),'-ac',str(channels),'-ar',str(rate),'-f',container,str(out)],check=True)
  data=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','a:0','-show_streams','-show_packets','-show_data','-of','json',str(out)]))
  (root/(ident+'.json')).write_text(json.dumps(data))
  subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-i',str(out),'-map','0:a:0','-f','f32le',str(root/(ident+'.f32'))],check=True)
  if profile in ['lossless','pcm']:
   subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-i',str(out),'-map','0:a:0','-f','s32le',str(root/(ident+'.s32'))],check=True)
  if codec=='pcm-f64le':
   subprocess.run(['ffmpeg','-v','error','-cpuflags','0','-y','-i',str(out),'-map','0:a:0','-f','f64le',str(root/(ident+'.f64'))],check=True)
  measured=int(data['streams'][0].get('bits_per_raw_sample') or data['streams'][0].get('bits_per_sample') or bits)
  results.append(dict(id=ident,profile=profile,codec="flac" if codec=="flac24" else codec,sampleRate=rate,channels=channels,bitsPerSample=measured,input=str(out)))
if selected and (root/'fixtures.json').exists():
 ids={f['id'] for f in results};results=[f for f in json.loads((root/'fixtures.json').read_text()) if f['id'] not in ids]+results
(root/'fixtures.json.tmp').write_text(json.dumps(results,indent=2)+'\n')
(root/'fixtures.json.tmp').replace(root/'fixtures.json')
print(f'{len(results)} fixtures: {root}')
