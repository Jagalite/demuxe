#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Independent multi-track, resampling and surround PCM correctness fixtures."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
def sha(p):return hashlib.file_digest(p.open('rb'),'sha256').hexdigest()
def main(out,extended=False):
 out=out.resolve();out.mkdir();ffmpeg=Path(shutil.which('ffmpeg')).resolve();shutil.copyfile(Path(__file__),out/'generator.py')
 record={'scope':'Generated track selection and input/output audio geometry fixtures','ffmpeg':str(ffmpeg),'ffmpegSHA256':sha(ffmpeg),'commands':[],'rows':[]}
 def run(args):
  argv=[str(ffmpeg),'-hide_banner','-loglevel','error',*map(str,args)];record['commands'].append(argv);subprocess.run(argv,check=True)
 try:
  specs=[('h264-8k-mono',1,8000,False),('h264-32k-quad',4,32000,False),('h264-96k',2,96000,False),('h264-192k-71',8,192000,False)] if extended else [('audio-only',2,48000,False),('h264-mono',1,48000,False),('h264-dual-audio',2,48000,True),('h264-resample',2,44100,False),('h264-pcm-51',6,48000,False),('h264-pcm-71',8,48000,False)]
  for key,channels,rate,dual in specs:
   folder=out/key;folder.mkdir();fixture=folder/'fixture.mkv'
   expression='|'.join(f'0.08*sin(2*PI*{997+channel*137}*t)' for channel in range(channels));layout={1:'mono',2:'stereo',4:'quad',6:'5.1',8:'7.1'}[channels]
   inputs=['-f','lavfi','-i','testsrc2=size=320x180:rate=30:duration=6','-f','lavfi','-i',f'aevalsrc={expression}:s={rate}:c={layout}:d=6']
   if dual:inputs+=['-f','lavfi','-i','sine=frequency=2013:sample_rate=48000:duration=6']
   maps=([] if key=='audio-only' else ['-map','0:v'])+['-map','1:a']+(['-map','2:a'] if dual else [])
   options=['-c:v','libx264','-preset','veryfast','-threads','2','-g','60','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-c:a','pcm_s24le']
   if dual:options+=['-ac:a:1','2','-disposition:a:0','default','-disposition:a:1','0','-metadata:s:a:0','title=Primary 997/1134','-metadata:s:a:1','title=Alternate 2013']
   run([*inputs,*maps,*options,'-shortest',fixture])
   if key!='audio-only':run(['-i',fixture,'-map','0:v:0','-f','rawvideo','-pix_fmt','rgb24',folder/'reference.rgb'])
   for index in range(2 if dual else 1):
    run(['-i',fixture,'-map',f'0:a:{index}','-f','f32le','-ac',str(channels),'-ar','48000',folder/f'reference-{index}.f32'])
    run(['-i',fixture,'-map',f'0:a:{index}','-f','f32le','-ac','2','-ar','48000',folder/f'reference-{index}-stereo.f32'])
   record['rows'].append({'profile':{'key':key,'fixture':str(fixture),'width':320,'height':180,'fps':30,'duration':6,'channels':channels,'inputRate':rate,'audioTracks':2 if dual else 1},'files':{p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in folder.iterdir()}})
  record['status']='generated'
 except Exception as e:record.update(status='failed',error=str(e));raise
 finally:(out/'references.json').write_text(json.dumps(record,indent=2)+'\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--extended',action='store_true');a=p.parse_args();main(a.out,a.extended)
