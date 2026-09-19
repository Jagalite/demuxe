# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);commands=[]
for rate,hz in [(44100,440),(48000,880)]:
 args=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',f'sine=frequency={hz}:sample_rate={rate}:duration=2','-ac','2','-c:a','aac','-b:a','128k','-movflags','frag_keyframe+empty_moov+default_base_moof',str(out/f'audio-{rate}.mp4')];commands.append(args);subprocess.run(args,check=True)
args=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',r'aevalsrc=if(between(t\,0.5\,1.3)\,0.25*sin(2*PI*660*t)\,0):s=48000:d=2','-ac','2','-c:a','aac','-b:a','128k','-movflags','frag_keyframe+empty_moov+default_base_moof',str(out/'pulse.mp4')];commands.append(args);subprocess.run(args,check=True)
(out/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n')
