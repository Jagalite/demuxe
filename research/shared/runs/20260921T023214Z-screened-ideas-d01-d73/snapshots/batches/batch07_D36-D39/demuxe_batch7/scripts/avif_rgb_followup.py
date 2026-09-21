"""SPDX-License-Identifier: MIT. Separate RGB AVIF subgroup, not a repair of the YUV source."""
from avif_route import *

def compatible(items):
 for x in items:
  if any(x[k]!=items[0][k] for k in ['width','height','av1c','colr','sequence']):raise ValueError('incompatible item configuration')
def main():
 items=[]
 for i in range(3):
  run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'testsrc2=size=160x96:rate=1:duration=1,hue=h={i*87}','-vf','format=gbrp,setparams=range=full:color_primaries=bt709:color_trc=iec61966-2-1:colorspace=gbr','-frames:v','1','-c:v','libaom-av1','-cpu-used','8','-crf','20','-still-picture','1','-pix_fmt','gbrp','-color_primaries','bt709','-color_trc','iec61966-2-1','-colorspace','rgb','-color_range','pc',F/f'rgb{i}.avif']);items.append(extract((F/f'rgb{i}.avif').read_bytes()))
 compatible(items);dt=[6000,18000,9000];data,stsd=make_header(items,dt);(F/'rgb_timeline.mp4').write_bytes(data);frag=init_from_regular(data,stsd);t=0
 for i,x in enumerate(items):frag+=fragment(x['coded'],dt[i],t,i+1);t+=dt[i]
 (F/'rgb_timeline_fragmented.mp4').write_bytes(frag)
 expected=b''.join(run(['ffmpeg','-v','error','-i',F/f'rgb{i}.avif','-frames:v','1','-f','rawvideo','-pix_fmt','gbrp','-'])for i in range(3));res={'items':[{'file':f'rgb{i}.avif','coded_bytes':len(x['coded']),'coded_sha256':sha(x['coded']),'av1c':x['av1c'].hex(),'colr':x['colr'].hex()}for i,x in enumerate(items)],'outputs':{},'controls':{}}
 for n in ['rgb_timeline.mp4','rgb_timeline_fragmented.mp4']:
  pr=probe(n)['packets'];out=run(['ffmpeg','-v','error','-i',F/n,'-fps_mode','passthrough','-f','rawvideo','-pix_fmt','gbrp','-']);matches=[p['data_hash'].split(':')[1]==sha(x['coded'])for p,x in zip(pr,items)];res['outputs'][n]={'packets':len(pr),'packet_matches':matches,'host_gbr_equal':out==expected,'host_gbr_bytes':len(out),'host_gbr_sha256':sha(out),'bytes':len((F/n).read_bytes())};assert all(matches) and out==expected
 # Actual candidate compatibility guard, exercised on valid incompatible RGB vs YUV items.
 try:compatible([items[0],extract((F/'image0.avif').read_bytes())]);res['controls']['incompatible_configuration']={'rejected':False}
 except ValueError as e:res['controls']['incompatible_configuration']={'rejected':True,'reason':str(e)}
 save('avif_rgb_component.json',res);save('avif_rgb_manifest.json',{'codec':'av01.1.00M.08','duration':2.75,'images':[f'rgb{i}.avif'for i in range(3)],'file':'rgb_timeline.mp4','fragmented':'rgb_timeline_fragmented.mp4','targets':[.125,.625,1.125,1.875,2.125,2.625],'indices':[0,1,1,1,2,2]});print(json.dumps(res,indent=2))
if __name__=='__main__':main()
