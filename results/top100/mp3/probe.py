# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib,array
r=Path(__file__).parent;cmd=['ffmpeg','-v','error','-y','-f','lavfi','-i','aevalsrc=0.1*sin(2*PI*(300*t+90*t*t))|0.1*sin(2*PI*(700*t+60*t*t)):s=48000:d=8','-c:a','libmp3lame','-b:a','128k','-write_xing','0',str(r/'source.mp3')];subprocess.run(cmd,check=True);source=(r/'source.mp3').read_bytes();packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-of','json',str(r/'source.mp3')]))['packets'];assert all(p['duration']==338688 for p in packets)
def decode(p):return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','f32le','-'],stderr=subprocess.DEVNULL)
full=decode(r/'source.mp3');framebytes=1152*2*4;assert len(full)==len(packets)*framebytes;rows=[]
for target in [100,220]:
 expected=full[target*framebytes:]
 for prior in range(5):
  body=b''.join(source[int(p['pos']):int(p['pos'])+int(p['size'])] for p in packets[target-prior:]);path=r/f'target{target}-prior{prior}.mp3';path.write_bytes(body);decoded=decode(path);actual=decoded[prior*framebytes:];a=array.array('f');a.frombytes(actual);b=array.array('f');b.frombytes(expected);error=max((abs(x-y) for x,y in zip(a,b)),default=0);rows.append({'targetPacket':target,'priorFrames':prior,'prerollMs':prior*24,'samples':len(a),'exact':actual==expected,'maxAbsError':error,'prefixBytes':sum(int(p['size']) for p in packets[target-prior:target])})
assert all(any(x['exact'] for x in rows if x['targetPacket']==t) for t in [100,220]);assert any(not x['exact'] for x in rows if x['priorFrames']==0)
(r/'result.json').write_text(json.dumps({'scope':'Authored48k stereo128k MP3 without Xing gapless metadata; continuous float PCM reference, exact coded-packet suffix closure at two targets. No universal2-frame rule or browser seek admission.','rows':rows,'sourceSHA256':hashlib.sha256(source).hexdigest(),'command':cmd,'passed':True},indent=2)+'\n')
