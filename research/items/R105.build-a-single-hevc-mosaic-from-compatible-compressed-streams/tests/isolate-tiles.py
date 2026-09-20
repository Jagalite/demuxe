# SPDX-License-Identifier: Apache-2.0
import pathlib,json,sys,subprocess,re,hashlib
p=pathlib.Path(sys.argv[1]);o=pathlib.Path(sys.argv[2]);source=(p/'explicit.mp4').read_bytes();i=source.index(b'hvcC');size=int.from_bytes(source[i-4:i],'big');h=source[i+4:i-4+size];count=h[22];pos=23;entries=[]
for _ in range(count):
 typ=h[pos]&63;n=int.from_bytes(h[pos+1:pos+3],'big');pos+=3
 for __ in range(n):
  z=int.from_bytes(h[pos:pos+2],'big');pos+=2;entries.append((typ,h[pos:pos+z]));pos+=z
pps=[b for t,b in entries if t==34];assert len(pps)==1;old=pps[0]
def rbsp(b):
 out=bytearray();zero=0
 for v in b:
  if zero==2 and v==3:zero=0;continue
  out.append(v);zero=zero+1 if v==0 else 0
 return bytes(out)
def escape(b):
 out=bytearray();zero=0
 for v in b:
  if zero==2 and v<=3:out.append(3);zero=0
  out.append(v);zero=zero+1 if v==0 else 0
 return bytes(out)
tr=subprocess.run(['ffmpeg','-v','verbose','-i',str(p/'explicit.mp4'),'-c','copy','-bsf:v','trace_headers','-f','null','-'],capture_output=True);assert tr.returncode==0;(o/'original-trace.log').write_bytes(tr.stderr)
positions=[int(m.group(1)) for m in re.finditer(r'\]\s+(\d+)\s+loop_filter_across_tiles_enabled_flag\s+1\s+=\s+1',tr.stderr.decode())];assert set(positions)=={45};bit=positions[0];r=bytearray(rbsp(old));assert r[bit//8]&(1<<(7-bit%8));r[bit//8]&=~(1<<(7-bit%8));new=escape(r);assert len(new)==len(old);hits=source.count(old);assert hits==1;fixed=source.replace(old,new);(o/'explicit.mp4').write_bytes(fixed)
for n in ['a.mp4','b.mp4','mismatch-command.json']:(o/n).write_bytes((p/n).read_bytes())
(o/'patch.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(source).hexdigest(),'PPSmatches':hits,'bit':bit,'oldPPS':old.hex(),'newPPS':new.hex(),'onlyChangedByteOffsets':[i for i,(a,b) in enumerate(zip(source,fixed)) if a!=b],'reason':'GPAC2.4.0 merger hardcodes loop_filter_across_tiles_enabled_flag=1. Disable cross-tile boundary filtering to retain independently decoded regions. Actual trace supplies and validates flag location, bounded source-only patch not universal PPS writer.'},indent=2))
