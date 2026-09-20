# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json
from flac_bits import *
p=pathlib.Path(sys.argv[1]);f=(p/'four20.frame').read_bytes();m3=select(f,[3]);m1=select(f,[1]);joined=join_mono([(m3,0),(m1,0)]);(p/'joined.flac').write_bytes(stream([joined],2,20,257));assert joined==select(f,[3,1]);controls={'joinedCodedBitsExact':True}
for name,inputs in [('position',[(m3,0),(m1,1)]),('block',[(m3,0),(frame(0,256,1,20,[subframe([0]*256,20)]),0)])]:
 try:join_mono(inputs);raise RuntimeError('accepted')
 except ValueError:controls[name+'MismatchRejected']=True
source=parse_frame((p/'fixed20.frame').read_bytes());s=source['subframes'][0];b=Bits();b.add((s['bits']>>(s['length']-8))|1,8);b.add(1,3);b.add(s['bits']&((1<<(s['length']-8))-1),s['length']-8);wrong=frame(0,4096,1,24,[(b.v,b.n)]);(p/'wrong-wasted.flac').write_bytes(stream([wrong],1,24,4096));a=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'wrong-wasted.flac'),'-f','s32le','-']);ref=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'fixed20.flac'),'-f','s32le','-']);controls['wrongWastedCountDetected']=a!=ref and len(a)==len(ref);assert controls['wrongWastedCountDetected'];(p/'additional-controls.json').write_text(json.dumps(controls,indent=2));print(controls)
