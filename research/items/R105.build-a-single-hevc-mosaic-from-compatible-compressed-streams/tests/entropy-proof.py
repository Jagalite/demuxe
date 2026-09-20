# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,re,json,hashlib,sys
p=pathlib.Path(sys.argv[1]);
def rbsp(b):
 o=bytearray();z=0
 for v in b:
  if z==2 and v==3:z=0;continue
  o.append(v);z=z+1 if v==0 else 0
 return bytes(o)
def payloads(name):
 file=p/(name+'.mp4');b=subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-c','copy','-bsf:v','hevc_mp4toannexb','-f','hevc','-']);marks=list(re.finditer(b'\x00\x00(?:\x00)?\x01',b));nals=[b[m.end():(marks[i+1].start() if i+1<len(marks) else len(b))] for i,m in enumerate(marks)];vcl=[rbsp(n) for n in nals if n[0]>>1&63<32];r=subprocess.run(['ffmpeg','-v','verbose','-i',str(file),'-c','copy','-bsf:v','trace_headers','-f','null','-'],capture_output=True);assert r.returncode==0;(p/(name+'-headers.log')).write_bytes(r.stderr);chunks=r.stderr.decode().split('Slice Segment Header')[1:];offsets=[]
 for c in chunks:
  positions=[int(m.group(1)) for m in re.finditer(r'\]\s+(\d+)\s+alignment_bit_equal_to_(?:one|zero)',c)];assert positions;offsets.append((max(positions)+1)//8)
 assert len(vcl)==len(offsets);return [{'bytes':len(n)-off,'sha':hashlib.sha256(n[off:]).hexdigest(),'headerBytes':off} for n,off in zip(vcl,offsets)]
a,b,m=[payloads(n) for n in ['a','b','explicit']];assert len(a)==len(b)==6 and len(m)==12
for i,x in enumerate(m):assert x['sha']==[a,b][i%2][i//2]['sha'],(i,x,[a,b][i%2][i//2])
(p/'entropy-proof.json').write_text(json.dumps({'sourceA':a,'sourceB':b,'merged':m,'all12CABACPayloadsUnchanged':True,'observer':'Independent FFmpeg trace supplies byte-aligned slice-header end perNAL; emulation prevention removed, entropy/trailing payload hashes compared.'},indent=2));print('all12tilepayloads exact')
