# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess,hashlib,collections
from fractions import Fraction
r=Path(__file__).resolve().parents[3]/'research/shared/runs/20260919T200800Z-dolby'
def probe(name):return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(r/name)]))
def raw(s):return bytes.fromhex(''.join(line.split(': ',1)[1].split('  ')[0].replace(' ','') for line in s.splitlines() if ': ' in line))
def units(b):
 p=0;out=[]
 while p<len(b):
  n=int.from_bytes(b[p:p+4],'big');p+=4;assert n>=2 and p+n<=len(b);out.append(b[p:p+n]);p+=n
 return out
a=probe('glass-blowing2-dolby-vision-profile-8-1-frag.mp4');b=probe('hdr10-copyts.mp4');sa=a['streams'][0];sb=b['streams'][0];dv=next(x for x in sa['side_data_list'] if x['side_data_type']=='DOVI configuration record')
def guard(d):
 if not(d.get('dv_profile')==8 and d.get('dv_bl_signal_compatibility_id')==1 and d.get('bl_present_flag')==1 and d.get('el_present_flag')==0):raise ValueError('not admitted HDR10-compatible single-layer DV8.1')
guard(dv);bad=dict(dv,dv_profile=5);rejected=False
try:guard(bad)
except ValueError:rejected=True
assert rejected and len(a['packets'])==len(b['packets'])
def configs(stream,packets):
 extra=raw(stream['extradata']);p=23;out=set()
 for _ in range(extra[22]):
  typ=extra[p]&63;n=int.from_bytes(extra[p+1:p+3],'big');p+=3
  for _ in range(n):
   length=int.from_bytes(extra[p:p+2],'big');p+=2
   if typ in (32,33,34):out.add(extra[p:p+length])
   p+=length
 for packet in packets:
  out.update(u for u in units(raw(packet['data'])) if (u[0]>>1)&63 in (32,33,34))
 return out
assert configs(sa,a['packets'])==configs(sb,b['packets'])
counts=collections.Counter();retained=0
for x,y in zip(a['packets'],b['packets']):
 u=units(raw(x['data']));v=units(raw(y['data']));counts.update((p[0]>>1)&63 for p in u)
 kept=[p for p in u if (p[0]>>1)&63 not in (32,33,34,62)];assert kept==[p for p in v if (p[0]>>1)&63 not in (32,33,34)];retained+=len(kept)
 for t in ['pts','dts','duration']:assert Fraction(x[t])*Fraction(sa['time_base'])==Fraction(y[t])*Fraction(sb['time_base']),(t,x[t],y[t])
assert counts[62]>0 and not any(x['side_data_type']=='DOVI configuration record' for x in sb.get('side_data_list',[]))
for k in ['color_range','color_space','color_transfer','color_primaries','pix_fmt','width','height']:assert sa[k]==sb[k],k
f=lambda name:[line.strip() for line in (r/name).read_text().splitlines() if line and not line.startswith('#')]
framesa=f('source-copyts-frames.sha256');framesb=f('candidate-copyts-frames.sha256');assert framesa==framesb and len(framesa)==len(a['packets'])
result={'scope':'Host component, explicit HDR10-compatible base output from genuine DV8.1. Not preservation of requested Dolby rendering, no browser HDR display or energy claim.','sourceDV':dv,'profile5Rejected':rejected,'packets':len(a['packets']),'nalTypes':dict(counts),'removedRPU':counts[62],'allVCLAndNonDVSEIPayloadsExact':True,'parameterSetsRelocatedWithExactBytes':True,'allPacketTimingExact':True,'fullDecodedFrameHashesExact':True,'decodedFrames':len(framesa),'candidateDVConfigRemoved':True,'preservedColorFields':{k:sb[k] for k in ['color_range','color_space','color_transfer','color_primaries','pix_fmt']},'oracle':'Independent FFmpeg HEVC base decoding, full decoded frame SHA256 baseline versus stripped candidate; ordinary decoder intentionally does not apply Dolby reshaping.','passed':True}
(r/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
