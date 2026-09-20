# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import struct,json,sys,subprocess
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False);j=json.loads(Path('research/shared/runs/20260919T205835Z-palette-hap-packed-baseline/input.json').read_text());raw=bytes(j['hap']['packet'][4:]);assert len(raw)==8192
# Independent small author emits literal and copy2 records, including overlapping copies.
s=bytearray([128,64]);i=0;literal=bytearray();seen={};copies=overlap=0
def flush():
 if not literal:return
 n=len(literal)-1
 if n<60:s.append(n<<2)
 else:
  k=(n.bit_length()+7)//8;s.append((59+k)<<2);s.extend(n.to_bytes(k,'little'))
 s.extend(literal);literal.clear()
while i<len(raw):
 key=raw[i:i+4];old=seen.get(key);seen[key]=i;length=0
 if len(key)==4 and old is not None and i-old<=65535:
  while length<64 and i+length<len(raw)and raw[i+length]==raw[old+length]:length+=1
 if length>=4:
  flush();offset=i-old;s.append(((length-1)<<2)|2);s.extend(struct.pack('<H',offset));copies+=1;overlap+=length>offset;i+=length
 else:literal.append(raw[i]);i+=1
flush();packet=len(s).to_bytes(3,'little')+bytes([0xbb])+s;template=bytearray(Path('results/top100/gpu/hap.avi').read_bytes()[:216]);# retained AVI hdrl ends before moviLIST
for tag,offsets in [(b'avih',[(28,len(packet)),(32,128),(36,128)]),(b'strh',[(36,len(packet)),(52,128|(128<<16))]),(b'strf',[(4,128),(8,128),(20,len(packet))])]:
 pos=template.find(tag)+8
 for off,value in offsets:struct.pack_into('<I',template,pos+off,value)
body=b'movi'+b'00dc'+struct.pack('<I',len(packet))+packet+(b'\0'if len(packet)%2 else b'');avi=template+b'LIST'+struct.pack('<I',len(body))+body;struct.pack_into('<I',avi,4,len(avi)-8)
(out/'source.avi').write_bytes(avi);(out/'source.hap').write_bytes(packet);(out/'oracle.bc1').write_bytes(raw);(out/'oracle.rgba').write_bytes(bytes(j['hap']['rgba']));cmd=['ffmpeg','-v','error','-i',str(out/'source.avi'),'-f','rawvideo','-pix_fmt','rgba','-y',str(out/'host.rgba')];p=subprocess.run(cmd,capture_output=True,text=True);(out/'host.log').write_text(p.stderr);assert p.returncode==0,p.stderr;assert(out/'host.rgba').read_bytes()==bytes(j['hap']['rgba'])
(out/'prepare-results.json').write_text(json.dumps({'bytes':len(s),'decoded_bytes':len(raw),'copy_jobs':copies,'overlapping_copy_jobs':overlap,'host_rgba_exact':True,'command':cmd},indent=2)+'\n');assert overlap
(out/'plan.json').write_text(json.dumps({'contract':'Actual Snappy HapBC1 section; bounded CPUliteral/copyjob parser without expansion, serial persection GPUordered jobs handle overlap; exact reconstructed8192B and independentFFmpeg finalRGBA, legal256B-row BC1 buffer-to-texturecopy. Wrongoffset/truncation/outputcap rejected beforedispatch; staleGPUpublication discarded.','performance':'9alternating colddevice30frame jobs compare CPU Snappy jobexpansion+compressedupload with GPUjob reconstruction+buffer-to-texture. SameBC1sample/render/fullRGBAreadback/hash, charge parser/device/pipeline/buffers/submit/map/teardown. Lower95saving>=10%. No claim parallelSnappy acceleration beforecost gate.'},indent=2)+'\n')
