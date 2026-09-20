# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,sys,json,array,math
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);W,H=160,96;freqs=[[320,400,480,560],[900,1000,1100,1200]]
def ff(args):return subprocess.check_output(['ffmpeg','-v','error','-nostdin','-y',*args],timeout=30)
def raw(order):
 frames=[]
 for sec in order:
  frame=bytearray([24,32,48]*(W*H));code=0xa0+sec
  for bit in range(8):
   for y in range(24,72):
    for x in range(8+bit*18,20+bit*18):frame[(y*W+x)*3:(y*W+x)*3+3]=bytes([235 if code>>bit&1 else 16]*3)
  frames.extend([frame]*24)
 return b''.join(frames)
(out/'source.rgb').write_bytes(raw(range(4)));(out/'reordered.rgb').write_bytes(raw([0,2,1,3]));pcm=array.array('f')
for n in range(192000):
 for ch in range(2):pcm.append(.3*math.sin(2*math.pi*freqs[ch][n//48000]*n/48000))
(out/'source.f32').write_bytes(pcm.tobytes());ff(['-f','rawvideo','-pixel_format','rgb24','-video_size','160x96','-framerate','24','-i',str(out/'source.rgb'),'-f','f32le','-ar','48000','-ac','2','-i',str(out/'source.f32'),'-c:v','libx264','-crf','0','-g','24','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',str(out/'correct.mp4')]);ff(['-f','rawvideo','-pixel_format','rgb24','-video_size','160x96','-framerate','24','-i',str(out/'reordered.rgb'),'-i',str(out/'correct.mp4'),'-map','0:v','-map','1:a','-c:v','libx264','-crf','0','-g','24','-pix_fmt','yuv420p','-c:a','copy',str(out/'video-reordered.mp4')]);ff(['-i',str(out/'correct.mp4'),'-c:v','copy','-af','pan=stereo|c0=c1|c1=c0','-c:a','aac','-b:a','192k',str(out/'channels-swapped.mp4')]);ff(['-i',str(out/'correct.mp4'),'-c:v','copy','-af','adelay=500|500,atrim=duration=4','-c:a','aac','-b:a','192k',str(out/'audio-shifted.mp4')])
def power(xs,f):
 c=2*math.cos(2*math.pi*f/48000);a=b=0
 for x in xs:q=x+c*a-b;b=a;a=q
 return a*a+b*b-c*a*b
rows=[];allfreq=freqs[0]+freqs[1]
for name in ['correct','video-reordered','channels-swapped','audio-shifted']:
 rgb=ff(['-i',str(out/(name+'.mp4')),'-map','0:v:0','-pix_fmt','rgb24','-f','rawvideo','-']);audio=array.array('f');audio.frombytes(ff(['-i',str(out/(name+'.mp4')),'-map','0:a:0','-ar','48000','-ac','2','-f','f32le','-']));codes=[]
 for n in range(96):
  frame=rgb[n*W*H*3:(n+1)*W*H*3];codes.append(sum((frame[(48*W+14+18*b)*3]>128)<<b for b in range(8)))
 tones=[]
 for c in range(2):
  channel=audio[c::2];tones.append([max(allfreq,key=lambda f:power(channel[sec*48000+7200:sec*48000+16800],f)) if max(abs(x) for x in channel[sec*48000+7200:sec*48000+16800])>.01 else 0 for sec in range(4)])
 rows.append({'name':name,'codes':codes,'tones':tones,'videoExpected':codes==[0xa0+i//24 for i in range(96)],'audioExpected':tones==freqs,'decodedFrames':len(rgb)//(W*H*3),'decodedAudioFrames':len(audio)//2})
assert rows[0]['videoExpected'] and rows[0]['audioExpected'];assert all(not(r['videoExpected'] and r['audioExpected']) for r in rows[1:]);(out/'host-result.json').write_text(json.dumps({'rows':rows,'frequencies':freqs,'passed':True},indent=2)+'\n');print(json.dumps([{k:v for k,v in r.items() if k!='codes'} for r in rows]))
