# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,re,hashlib
p=pathlib.Path(sys.argv[1]);b=(p/'source.mov').read_bytes();i=b.index(b'hvcC');n=int.from_bytes(b[i-4:i],'big');h=b[i+4:i-4+n];pos=23;entries=[]
for _ in range(h[22]):
 tag=h[pos];count=int.from_bytes(h[pos+1:pos+3],'big');pos+=3;items=[]
 for __ in range(count):
  z=int.from_bytes(h[pos:pos+2],'big');pos+=2;items.append(h[pos:pos+z]);pos+=z
 entries.append((tag,items))
tr=subprocess.run(['ffmpeg','-v','verbose','-i',str(p/'source.mov'),'-map','0:v','-c','copy','-bsf:v','trace_headers','-frames:v','1','-f','null','-'],capture_output=True);assert tr.returncode==0;(p/'source-trace.log').write_bytes(tr.stderr);text=tr.stderr.decode()
field=lambda n:int(re.search(r'\]\s+(\d+)\s+'+n+r'\s+[01]+\s+=',text).group(1));assert [field(x) for x in ['vps_max_layers_minus1','vps_max_layer_id','vps_num_layer_sets_minus1','vps_timing_info_present_flag','vps_extension_flag']]==[22,154,160,165,166]
def rbsp(b):
 out=bytearray();z=0
 for v in b:
  if z==2 and v==3:z=0;continue
  out.append(v);z=z+1 if v==0 else 0
 return bytes(out)
def escape(b):
 out=bytearray();z=0
 for v in b:
  if z==2 and v<=3:out.append(3);z=0
  out.append(v);z=z+1 if v==0 else 0
 return bytes(out)
vps=next(ns[0] for tag,ns in entries if tag&63==32);bits=''.join(f'{v:08b}' for v in rbsp(vps));assert bits[22:28]=='000001' and bits[154:160]=='000001' and bits[160:165]=='01011' and bits[165:167]=='01';newbits=bits[:22]+'000000'+bits[28:154]+'000000'+'1'+'0'+'0'+'1';newbits+='0'*((-len(newbits))%8);newvps=escape(bytes(int(newbits[i:i+8],2) for i in range(0,len(newbits),8)));(p/'base-vps.bin').write_bytes(newvps)
arrays=[]
for tag,ns in entries:
 if tag&63 not in [32,33,34]:continue # scope SDR; discard stereo ancillarySEI in decoderconfiguration
 vals=[(newvps if tag&63==32 else n) for n in ns if (((n[0]&1)<<5)|(n[1]>>3))==0]
 if vals:arrays.append(bytes([tag])+len(vals).to_bytes(2,'big')+b''.join(len(v).to_bytes(2,'big')+v for v in vals))
config=h[:22]+bytes([len(arrays)])+b''.join(arrays);(p/'base-hvcc.bin').write_bytes(config);(p/'configuration.json').write_text(json.dumps({'sourceSHA256':hashlib.sha256(b).hexdigest(),'originalVPS':vps.hex(),'baseVPS':newvps.hex(),'removed':'VPS enhancement layer set/extension; layer count/maxID to0. Stereo ancillarySEI removed. Base profile/level/DPBordering/SPS/PPS retained.','sourceEye':'FFprobe actual viewIDs0,1 positionsleft,right; base0 isleft, original primary eyeleft.','scope':'Pinned actual Apple sample with base-layer independent Main10 SDR configuration, not generic MVHEVC rewrite.'},indent=2))
