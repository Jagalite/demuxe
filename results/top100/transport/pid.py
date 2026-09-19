# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,subprocess
r=Path(__file__).parent;b=(r/'avc.ts').read_bytes();packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-of','json',str(r/'avc.ts')]))['packets'];v=[p for p in packets if p['codec_type']=='video'];split=int(next(p['pos'] for p in v if 'K' in p['flags'] and float(p['pts_time'])>=3.4));assert split%188==0
split=max(off for off in range(0,split+1,188) if (((b[off+1]&31)<<8)|b[off+2])==4096)
mapping={256:288}
def crc(data):
 value=0xffffffff
 for byte in data:
  value^=byte<<24
  for _ in range(8):value=((value<<1)^0x04c11db7 if value&0x80000000 else value<<1)&0xffffffff
 return value
out=bytearray(b);pmts=0
for off in range(split,len(b),188):
 p=bytearray(b[off:off+188]);assert p[0]==71;pid=((p[1]&31)<<8)|p[2]
 if pid in mapping:p[1]=(p[1]&224)|(mapping[pid]>>8);p[2]=mapping[pid]&255
 if pid==4096 and p[1]&64:
  at=4
  if p[3]&32:at+=p[4]+1
  at+=1+p[at];length=((p[at+1]&15)<<8)|p[at+2];end=at+3+length;assert end<=188 and p[at]==2
  p[at+5]=(p[at+5]&193)|((((p[at+5]>>1)+1)&31)<<1)
  x=((p[at+8]&31)<<8)|p[at+9]
  if x in mapping:p[at+8]=(p[at+8]&224)|(mapping[x]>>8);p[at+9]=mapping[x]&255
  q=at+12+(((p[at+10]&15)<<8)|p[at+11])
  while q<end-4:
   x=((p[q+1]&31)<<8)|p[q+2]
   if x in mapping:p[q+1]=(p[q+1]&224)|(mapping[x]>>8);p[q+2]=mapping[x]&255
   q+=5+(((p[q+3]&15)<<8)|p[q+4])
  p[end-4:end]=crc(p[at:end-4]).to_bytes(4,'big');assert crc(p[at:end])==0;pmts+=1
 out[off:off+188]=p
(r/'pid-change.ts').write_bytes(out)
probe=lambda path,merge:json.loads(subprocess.check_output(['ffprobe','-v','error','-merge_pmt_versions',str(merge),'-i',str(path),'-show_streams','-show_packets','-show_data_hash','sha256','-of','json']))
original=probe(r/'avc.ts',0);unmerged=probe(r/'pid-change.ts',0);merged=probe(r/'pid-change.ts',1)
checks=[]
for kind in ['video','audio']:
 a=[p for p in original['packets'] if p['codec_type']==kind];c=[p for p in merged['packets'] if p['codec_type']==kind];original_rows=[(p['pts'],p['dts'],p['data_hash']) for p in a];merged_rows=[(p['pts'],p['dts'],p['data_hash']) for p in c];same=sorted(original_rows)==sorted(merged_rows);assert same;checks.append({'type':kind,'packets':len(a),'exactPayloadPtsDtsMultiset':same,'demuxOrderPreserved':original_rows==merged_rows})
(r/'pid-result.json').write_text(json.dumps({'splitByte':split,'rewrittenPmts':pmts,'originalStreams':len(original['streams']),'unmergedStreams':len(unmerged['streams']),'mergedStreams':len(merged['streams']),'checks':checks,'passed':True},indent=2)+'\n')
