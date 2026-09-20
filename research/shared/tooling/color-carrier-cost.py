# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,time,statistics
out=pathlib.Path(sys.argv[1]);base=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True);oracle=json.loads((base/'oracle.json').read_text());W,H,N=oracle['width'],oracle['height'],oracle['frames'];rows=[];plan={'scope':'Prepared exact8bitfullresolutionYUV planes. Both native444 and420carrier already decode correctly here, so this compares complete cold preparation+binaryHTTP delivery+decode+plane materialization, not additional codec admission. Source fixed ownedsynthetic12frames,7 alternatingpairs.','gate':'Allfullplanes/source timestamps exact, wronglane/layoutreject, ownersclose; median complete task>=5percent improvement. No generalproducer/physicalhardware/color-display claim.'};(out/'plan.json').write_text(json.dumps(plan,indent=2)+'\n');(out/'oracle.json').write_text(json.dumps(oracle))
for pair in range(7):
 for mode in (['carrier','ordinary'] if pair%2 else ['ordinary','carrier']):
  t=time.perf_counter();source=(base/'source.yuv').read_bytes();w=W
  if mode=='carrier':
   chunks=[];w=W*3
   for i in range(N):
    f=source[i*W*H*3:(i+1)*W*H*3];chunks.append(b''.join(f[r*W:(r+1)*W]+f[W*H+r*W:W*H+(r+1)*W]+f[W*H*2+r*W:W*H*2+(r+1)*W] for r in range(H))+bytes([128])*(W*3*H//2))
   raw=out/f'{pair}-{mode}.yuv';raw.write_bytes(b''.join(chunks))
  else:raw=base/'source.yuv'
  encoded=out/f'{pair}-{mode}.h264';subprocess.run(['ffmpeg','-v','error','-nostdin','-f','rawvideo','-pix_fmt','yuv420p' if mode=='carrier' else 'yuv444p','-s',f'{w}x{H}','-r','24','-i',str(raw),'-c:v','libx264','-crf','0','-preset','fast','-g','12','-bf','0','-f','h264',str(encoded)],check=True,timeout=20);probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-of','json',str(encoded)]));index=[{'offset':int(p['pos']),'size':int(p['size']),'timestamp':round(i*1e6/24),'key':'K' in p['flags']} for i,p in enumerate(probe['packets'])];(out/f'{pair}-{mode}.json').write_text(json.dumps(index));rows.append({'pair':pair,'mode':mode,'prepareMs':(time.perf_counter()-t)*1000,'encodedBytes':encoded.stat().st_size})
(out/'preparation.json').write_text(json.dumps({'plan':plan,'rows':rows},indent=2)+'\n');print('prepared14matchedjobs')
