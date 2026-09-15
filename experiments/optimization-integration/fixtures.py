#!/usr/bin/env python3
"""Generate controlled timestamp cases; native FFmpeg is fixture preparation only."""
import itertools, subprocess, pathlib, json, hashlib
out=pathlib.Path('build/optimization-fixtures');out.mkdir(parents=True,exist_ok=True)
records=[]
for bframes,offset,mismatch in itertools.product([0,2],[0,2],[False,True]):
 name=f'b{bframes}-start{offset}-mismatch{int(mismatch)}';path=out/(name+'.mkv')
 command=['ffmpeg','-hide_banner','-nostdin','-n','-f','lavfi','-i','testsrc2=size=160x90:rate=30:duration=3.1','-f','lavfi','-i',f'aevalsrc=0.1*sin(2*PI*440*t)|0.07*sin(2*PI*660*t):s=48000:d={2.417 if mismatch else 3.1}:c=stereo','-map','0:v','-map','1:a','-c:v','libx264','-preset','veryfast','-crf','24','-g','30','-bf',str(bframes),'-pix_fmt','yuv420p','-c:a','pcm_s24le','-output_ts_offset',str(offset),'-threads','2',str(path)]
 if not path.exists():subprocess.run(command,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-show_packets','-of','json',str(path)]))
 (out/(name+'.json')).write_text(json.dumps(probe,indent=2)+'\n')
 records.append({'name':name,'command':command,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'missingVideoDTS':sum(p['codec_type']=='video' and 'dts' not in p for p in probe['packets'])})
pathlib.Path('results/optimization-integration/fixture-manifest.json').write_text(json.dumps(records,indent=2)+'\n')
gain=out/'gain.mp4'
command=['ffmpeg','-hide_banner','-nostdin','-n','-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=12','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=12','-c:v','libx264','-preset','ultrafast','-crf','28','-g','30','-bf','0','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-threads','2',str(gain)]
if not gain.exists():subprocess.run(command,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
pathlib.Path('results/optimization-integration/gain-fixture.json').write_text(json.dumps({'command':command,'sha256':hashlib.sha256(gain.read_bytes()).hexdigest()},indent=2)+'\n')

# Lifecycle and selected-track fixtures use the same deterministic source family.
extra=[]
long=out/'long-pcm.mkv'
command=['ffmpeg','-v','error','-nostdin','-n','-f','lavfi','-i','testsrc2=size=160x90:rate=30:duration=30','-f','lavfi','-i','aevalsrc=0.1*sin(2*PI*440*t)|0.07*sin(2*PI*660*t):s=48000:d=29.417:c=stereo','-c:v','libx264','-preset','veryfast','-crf','24','-g','30','-bf','2','-c:a','pcm_s24le','-threads','2',str(long)]
extra.append((long,command))
multi=out/'multi-audio.mkv'
command=['ffmpeg','-v','error','-nostdin','-n','-i',str(out/'b2-start0-mismatch1.mkv'),'-f','lavfi','-i','sine=frequency=997:sample_rate=44100:duration=3.1','-map','0:v','-map','0:a','-map','1:a','-c:v','copy','-c:a:0','copy','-c:a:1','pcm_s16le',str(multi)]
extra.append((multi,command))
offset=out/'audio-offset.mkv'
command=['ffmpeg','-v','error','-nostdin','-n','-i',str(out/'b2-start0-mismatch1.mkv'),'-itsoffset','0.137','-i',str(out/'b2-start0-mismatch1.mkv'),'-map','0:v','-map','1:a','-c','copy',str(offset)]
extra.append((offset,command))
for name,codec,channels in [('pcm32','pcm_s32le',2),('float','pcm_f32le',2),('surround','pcm_s24le',6)]:
 path=out/(name+'.mkv')
 command=['ffmpeg','-v','error','-nostdin','-n','-i',str(out/'b2-start0-mismatch1.mkv'),'-map','0:v','-map','0:a','-c:v','copy','-c:a',codec,'-ac',str(channels),str(path)]
 extra.append((path,command))
for name,rate,video_duration,audio_duration,gop,bframes in [('audio-tail',30,1,30,30,2),('low-fps-inter',1,15,15,10,0)]:
 path=out/(name+'.mkv')
 command=['ffmpeg','-v','error','-nostdin','-n','-f','lavfi','-i',f'testsrc2=size=160x90:rate={rate}:duration={video_duration}','-f','lavfi','-i',f'sine=frequency=440:sample_rate=48000:duration={audio_duration}','-c:v','libx264','-preset','veryfast','-g',str(gop),'-bf',str(bframes),'-c:a','pcm_s24le','-threads','2',str(path)]
 extra.append((path,command))
records=[]
for path,command in extra:
 if not path.exists():subprocess.run(command,check=True)
 records.append({'name':path.name,'command':command,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
pathlib.Path('results/optimization-integration/stage3/additional-fixtures.json').write_text(json.dumps(records,indent=2)+'\n')
