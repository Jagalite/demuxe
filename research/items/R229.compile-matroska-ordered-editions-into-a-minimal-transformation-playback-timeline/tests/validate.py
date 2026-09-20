# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import subprocess,json,hashlib,sys
out=Path(sys.argv[1]);fixture=Path('research/items/R229.compile-matroska-ordered-editions-into-a-minimal-transformation-playback-timeline/evidence/20260919T222900Z-ordered-edition');j=json.loads((fixture/'result.json').read_text());cmd=['ffmpeg','-v','error','-safe','0','-auto_convert','0','-f','concat','-i',str(fixture/'edition.ffconcat'),'-map','0','-c','copy',str(out/'compiled.mkv')];subprocess.run(cmd,check=True)
def run(c):return subprocess.check_output(c)
def packets(p):return json.loads(run(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(p)]))['packets']
a=packets(out/'compiled.mkv');got=[{'stream':p['stream_index'],'ptsMS':round(float(p['pts_time'])*1000),'hash':p['data_hash']} for p in a];key=lambda x:(x['stream'],x['ptsMS'],x['hash']);assert sorted(j['expectedPackets'],key=key)==sorted(got,key=key)
def video(p):return run(['ffmpeg','-v','error','-i',str(p),'-map','0:v','-f','rawvideo','-pix_fmt','yuv420p','-'])
def audio(p):return run(['ffmpeg','-v','error','-i',str(p),'-map','0:a','-f','s16le','-'])
vr={n:video(fixture/(n+'.mkv')) for n in ['a','b']};ar={n:audio(fixture/(n+'.mkv')) for n in ['a','b']};frame=160*96*3//2;expectedVideo=vr['a'][:24*frame]+vr['b']+vr['a'][:24*frame];expectedAudio=ar['a'][:48000*2]+ar['b']+ar['a'][:48000*2];actualVideo=video(out/'compiled.mkv');actualAudio=audio(out/'compiled.mkv');assert actualVideo==expectedVideo;assert actualAudio==expectedAudio
seeks=[]
for target in [.5,1.5,2.5,3.5,.5]:
 b=run(['ffmpeg','-v','error','-ss',str(target),'-i',str(out/'compiled.mkv'),'-frames:v','1','-an','-f','rawvideo','-pix_fmt','yuv420p','-']);index=round(target*24);assert b==expectedVideo[index*frame:(index+1)*frame];seeks.append({'virtualTime':target,'expectedFrame':index,'sha256':hashlib.sha256(b).hexdigest()})
(out/'result.json').write_text(json.dumps({'command':cmd,'packetTimelineExact':True,'all196PacketsExact':True,'videoFrames':len(actualVideo)//frame,'videoSHA256':hashlib.sha256(actualVideo).hexdigest(),'pcmSamples':len(actualAudio)//2,'pcmSHA256':hashlib.sha256(actualAudio).hexdigest(),'subtitlePackets':[x for x in a if x['stream_index']==2],'virtualSeeks':seeks,'controls':j['controls'],'scope':'Actual parsed ordered edition77, authorized linked SegmentUIDs, explicit track-role mapping and repeated source intervals. No native browser Matroska ordered-edition implementation or general configuration transitions.'},indent=2));print({'frames':len(actualVideo)//frame,'pcm':len(actualAudio)//2})
