from build import *
import numpy as np
r=np.frombuffer(ff('-c:a','libopus','-i',F/'mono.opus','-f','f32le','-'),'<f4');o={}
for name,mapping in [('dual',[0,0]),('left',[0,255]),('right',[255,0])]:
 b=ff('-c:a','libopus','-i',F/(name+'.opus'),'-f','f32le','-');a=np.frombuffer(b,'<f4').reshape(-1,2);expected=np.stack([r if i==0 else np.zeros_like(r) for i in mapping],axis=1)
 native=np.frombuffer(raw(name+'.opus'),'<f4').reshape(-1,2)
 o[name]={'libopus_frames':len(a),'libopus_mismatches':int(np.count_nonzero(a!=expected)),'libopus_pcm_hash':sha(b),'default_decoder_nonzero_per_channel':[int(np.count_nonzero(native[:,i])) for i in range(2)],'default_decoder_hash':sha(native.tobytes())}
# Record actual decoder selection, separate from generic executable version.
for decoder in ['default','libopus']:
 args=['ffmpeg','-hide_banner','-nostdin','-v','info']+(['-c:a','libopus'] if decoder=='libopus' else [])+['-i',str(F/'left.opus'),'-f','null','-']
 p=subprocess.run(args,capture_output=True);(E/('left_'+decoder+'_decoder.txt')).write_bytes(p.stderr)
save('opus_additional_oracle.json',o);print(json.dumps(o,indent=2))
