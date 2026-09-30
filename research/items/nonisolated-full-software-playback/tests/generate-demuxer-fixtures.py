#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Raw SBC requires an extension or explicit demuxer; references decode independently."""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main(out):
 out=out.resolve();out.mkdir();ffmpeg=Path(shutil.which('ffmpeg')).resolve();shutil.copyfile(__file__,out/'generator.py')
 record={'scope':'Raw demuxer hint and extension fixtures','ffmpeg':str(ffmpeg),'ffmpegSHA256':sha(ffmpeg),'commands':[],'rows':[]}
 def run(args):
  command=[str(ffmpeg),'-hide_banner','-loglevel','error',*map(str,args)];record['commands'].append(command);subprocess.run(command,check=True)
 try:
  for key,filename,demuxer in [('sbc-extension','audio.sbc',None),('sbc-hint','unknown','sbc')]:
   folder=out/key;folder.mkdir();fixture=folder/'fixture.sbc'
   run(['-f','lavfi','-i','aevalsrc=0.08*sin(2*PI*997*t)|0.08*sin(2*PI*1134*t):s=48000:c=stereo:d=6','-c:a','sbc','-b:a','328k','-f','sbc',fixture])
   run(['-f','sbc','-i',fixture,'-f','f32le','-ac','2','-ar','48000',folder/'reference-0-stereo.f32'])
   profile={'key':key,'fixture':str(fixture),'filename':filename,'width':320,'height':180,'fps':0,'duration':6,'channels':2,'inputRate':48000,'audioTracks':1}
   if demuxer:profile['demuxer']=demuxer
   record['rows'].append({'profile':profile,'files':{p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in folder.iterdir()}})
  record['status']='generated'
 except Exception as error:record.update(status='failed',error=str(error));raise
 finally:(out/'references.json').write_text(json.dumps(record,indent=2)+'\n')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);a=p.parse_args();main(a.out)
