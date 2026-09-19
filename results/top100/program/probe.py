# SPDX-License-Identifier: Apache-2.0
import subprocess,json,hashlib
from pathlib import Path
r=Path(__file__).parent
cmd=['ffmpeg','-v','error','-y','-f','lavfi','-i','color=red:s=160x96:r=12:d=2','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=2','-f','lavfi','-i','color=lime:s=160x96:r=12:d=2','-f','lavfi','-i','sine=frequency=880:sample_rate=48000:duration=2','-map','0:v','-map','1:a','-map','2:v','-map','3:a','-c:v','libx264','-preset','ultrafast','-g','12','-c:a','aac','-program','program_num=101:st=0:st=1','-program','program_num=202:st=2:st=3','-f','mpegts',str(r/'multi.ts')];subprocess.run(cmd,check=True);source=(r/'multi.ts').read_bytes()
def crc(data):
 v=0xffffffff
 for b in data:
  v^=b<<24
  for _ in range(8):v=((v<<1)^0x04c11db7 if v&0x80000000 else v<<1)&0xffffffff
 return v
def section(p):
 at=4+(p[4]+1 if p[3]&32 else 0);at+=1+p[at];n=((p[at+1]&15)<<8)|p[at+2];s=p[at:at+3+n];assert crc(s)==0;return at,s
def packets(data):
 assert len(data)%188==0
 for off in range(0,len(data),188):
  p=data[off:off+188];assert p[0]==71;yield ((p[1]&31)<<8)|p[2],p
def select(data,program):
 pat=next(section(p)[1] for pid,p in packets(data) if pid==0 and p[1]&64);entries=[pat[i:i+4] for i in range(8,len(pat)-4,4)];chosen=next((e for e in entries if int.from_bytes(e[:2],'big')==program),None)
 if chosen is None:raise ValueError('program absent')
 pmtpid=((chosen[2]&31)<<8)|chosen[3];pmt=next(section(p)[1] for pid,p in packets(data) if pid==pmtpid and p[1]&64);keep={0,pmtpid,((pmt[8]&31)<<8)|pmt[9]};q=12+(((pmt[10]&15)<<8)|pmt[11])
 while q<len(pmt)-4:keep.add(((pmt[q+1]&31)<<8)|pmt[q+2]);q+=5+(((pmt[q+3]&15)<<8)|pmt[q+4])
 output=bytearray()
 for pid,p in packets(data):
  if pid not in keep:continue
  if pid==0:
   at,s=section(p);s=bytearray(s[:8]+chosen);n=len(s)+4-3;s[1]=(s[1]&240)|(n>>8);s[2]=n&255;s+=crc(s).to_bytes(4,'big');p=p[:at]+s+bytes([255])*(188-at-len(s))
  output.extend(p)
 return bytes(output),keep
# Reverse PAT declaration order while preserving elementary packets.
reversed_source=bytearray()
for pid,p in packets(source):
 if pid==0:
  at,s=section(p);e=[s[i:i+4] for i in range(8,len(s)-4,4)];s=s[:8]+b''.join(reversed(e));s+=crc(s).to_bytes(4,'big');p=p[:at]+s+p[at+len(s):]
 reversed_source.extend(p)
(r/'reversed.ts').write_bytes(reversed_source)
probe=lambda f:json.loads(subprocess.check_output(['ffprobe','-v','error','-show_programs','-show_packets','-show_data_hash','sha256','-of','json',str(f)]))
original=probe(r/'multi.ts');selected=[p for p in original['programs'] if p['program_id']==202][0];ids={s['index'] for s in selected['streams']};expected=[(x['codec_type'],x['pts'],x['dts'],x['data_hash']) for x in original['packets'] if x['stream_index'] in ids];rows=[]
for name,data in [('normal',source),('reversed',bytes(reversed_source))]:
 candidate,keep=select(data,202);path=r/(name+'.ts');path.write_bytes(candidate);actual=probe(path);found=[(x['codec_type'],x['pts'],x['dts'],x['data_hash']) for x in actual['packets']];assert found==expected;rows.append({'name':name,'bytes':len(candidate),'pids':sorted(keep),'packetIdentityAndTimingExact':True,'packets':len(found)})
try:select(source,999);raise AssertionError('missing program accepted')
except ValueError:pass
(r/'result.json').write_text(json.dumps({'scope':'Restricted single-packet PAT/PMT MPEG-TS selector; preserves selected elementary packets and PCR. No dynamic table versions or scrambled transport.','command':cmd,'sourceBytes':len(source),'rows':rows,'absentProgramRejected':True,'passed':True},indent=2)+'\n')
