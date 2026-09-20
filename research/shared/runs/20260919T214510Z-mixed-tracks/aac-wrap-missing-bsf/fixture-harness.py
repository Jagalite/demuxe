# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,sys,time,statistics
p=pathlib.Path(sys.argv[1]);commands=[]
def run(args):
 t=time.perf_counter();s=subprocess.run(args,capture_output=True);commands.append({'args':args,'exit':s.returncode,'stderr':s.stderr.decode(errors='replace'),'wallSeconds':time.perf_counter()-t});assert s.returncode==0,commands[-1];return commands[-1]['wallSeconds']
base=['ffmpeg','-nostdin','-v','error','-y']
for name,color,size,codec in [('red','red','160x96','h264'),('blue','blue','160x96','h264'),('green','green','240x136','vp9')]:
 args=base+['-f','lavfi','-i',f'color=c={color}:s={size}:r=24:d=2']
 args+=['-c:v','libx264','-profile:v','baseline','-level','3.0','-g','24','-bf','0','-pix_fmt','yuv420p','-movflags','frag_keyframe+empty_moov+default_base_moof',str(p/(name+'.mp4'))] if codec=='h264' else ['-c:v','libvpx-vp9','-deadline','realtime','-cpu-used','6','-g','24','-pix_fmt','yuv420p',str(p/(name+'.webm'))]
 run(args)
signal=r'aevalsrc=0.06*sin(2*PI*440*t)+if(between(mod(t\,2)\,0.3\,0.5)\,0.2*sin(2*PI*880*t)\,0):s=48000:d=6'
run(base+['-f','lavfi','-i',signal,'-ac','2','-c:a','aac','-b:a','128k',str(p/'master.m4a')]);run(base+['-i',str(p/'master.m4a'),'-c:a','copy','-f','adts',str(p/'audio.aac')]);run(base+['-f','lavfi','-i',signal,'-ac','2','-c:a','libmp3lame','-b:a','128k',str(p/'audio.mp3')]);run(base+['-f','lavfi','-i',signal,'-ac','2','-c:a','libopus','-b:a','128k',str(p/'audio.webm')]);run(base+['-f','lavfi','-i',signal,'-ac','2','-c:a','pcm_f32le','-f','f32le',str(p/'reference.f32')])
wrap=base+['-i',str(p/'audio.aac'),'-c:a','copy','-movflags','frag_keyframe+empty_moov+default_base_moof',str(p/'audio.mp4')];rows=[run(wrap) for _ in range(6)];(p/'wrap-cost.json').write_text(json.dumps({'warmup':rows[0],'measuredSeconds':rows[1:],'medianSeconds':statistics.median(rows[1:]),'scope':'Fresh host FFmpeg rawAAC→fragmentedMP4 wrapping, input read/output write and process setup/teardown; encode excluded equally'},indent=2)+'\n');(p/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n')

wrapopus=base+['-i',str(p/'audio.webm'),'-c:a','copy','-movflags','frag_keyframe+empty_moov+default_base_moof',str(p/'audio-opus.mp4')];rows=[run(wrapopus) for _ in range(6)];(p/'opus-wrap-cost.json').write_text(json.dumps({'warmup':rows[0],'measuredSeconds':rows[1:],'medianSeconds':statistics.median(rows[1:]),'scope':'Fresh hostFFmpeg WebMOpus→fragmentedMP4 packet-copy wrap, include input/output/process cost'},indent=2)+'\n');(p/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n')
