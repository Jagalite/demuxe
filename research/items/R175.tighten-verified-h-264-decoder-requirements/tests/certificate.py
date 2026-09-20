# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,re,hashlib,sys
p=pathlib.Path(sys.argv[1]);commands=[]
def run(c):
 commands.append(c);x=subprocess.run(c,capture_output=True);assert x.returncode==0,x.stderr.decode();return x.stdout,x.stderr
for n,refs in [('safe',1),('extra',2)]:
 run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=160x96:r=30:d=2','-an','-c:v','libx264','-profile:v','baseline','-bf','0','-refs',str(refs),'-g','30','-keyint_min','30','-sc_threshold','0','-pix_fmt','yuv420p','-f','h264',str(p/(n+'.h264'))])
def split(b):
 marks=list(re.finditer(b'\x00\x00(?:\x00)?\x01',b));return [b[m.end():(marks[i+1].start() if i+1<len(marks) else len(b))] for i,m in enumerate(marks)]
def rbsp(n):
 o=bytearray();z=0
 for x in n:
  if z==2 and x==3:z=0;continue
  o.append(x);z=z+1 if x==0 else 0
 return bytes(o)
def escape(b):
 o=bytearray();z=0
 for x in b:
  if z==2 and x<=3:o.append(3);z=0
  o.append(x);z=z+1 if x==0 else 0
 return bytes(o)
def patch(n,new):
 if n[0]&31!=7:return n
 bits=''.join(f'{x:08b}' for x in rbsp(n[1:]));at=24
 assert int(bits[:8],2)==66
 def ue():
  nonlocal at
  z=0
  while bits[at]=='0':z+=1;at+=1
  at+=1;v=(1<<z)-1+int('0'+bits[at:at+z],2);at+=z;return v
 ue();ue();poc=ue()
 if poc==0:ue()
 else:assert poc==2
 start=at;old=ue();enc=bin(new+1)[2:];enc='0'*(len(enc)-1)+enc
 end=bits.rfind('1')+1;result=bits[:start]+enc+bits[at:end];result+='0'*((-len(result))%8)
 return bytes([n[0]])+escape(bytes(int(result[i:i+8],2) for i in range(0,len(result),8)))
safe=split((p/'safe.h264').read_bytes());over=[patch(n,8) for n in safe];candidate=[patch(n,1) for n in over]
for name,nals in [('overstated',over),('candidate',candidate)]:
 (p/(name+'.h264')).write_bytes(b''.join(b'\x00\x00\x00\x01'+n for n in nals));run(['ffmpeg','-v','error','-r','30','-i',str(p/(name+'.h264')),'-c','copy',str(p/(name+'.mp4'))])
assert all(a==b for a,b in zip(safe,candidate));assert [n for n in over if n[0]&31!=7]==[n for n in candidate if n[0]&31!=7]
# Full host trace is the independent syntax observer. Conservative profile rejects any second active ref or list/MMCO rewriting.
def certificate(file):
 _,err=run(['ffmpeg','-v','verbose','-i',str(file),'-map','0:v','-c','copy','-bsf:v','trace_headers','-f','null','-']);text=err.decode();(p/(file.stem+'-trace.log')).write_text(text)
 fields={}
 for line in text.splitlines():
  m=re.search(r'\]\s+\d+\s+(\w+(?:\[\d+\])?)\s+[01]+\s+=\s+(-?\d+)',line)
  if m:fields.setdefault(m[1],[]).append(int(m[2]))
 assertions={'progressive':all(x==1 for x in fields['frame_mbs_only_flag']),'IPOnly':all(x%5 in [0,2] for x in fields['slice_type']),'oneDefaultRef':all(x==0 for x in fields['num_ref_idx_l0_default_active_minus1']),'oneOverrideRef':all(x==0 for x in fields.get('num_ref_idx_l0_active_minus1',[])),'noListReordering':all(x==0 for x in fields.get('ref_pic_list_modification_flag_l0',[])),'noAdaptiveMMCO':all(x==0 for x in fields.get('adaptive_ref_pic_marking_mode_flag',[])),'noLongTermIDR':all(x==0 for x in fields.get('long_term_reference_flag',[]))}
 return {'accepted':all(assertions.values()),'assertions':assertions,'fields':fields}
c=certificate(p/'overstated.h264');neg=certificate(p/'extra.h264');assert c['accepted'];assert not neg['accepted']
frames=[]
for name in ['overstated','candidate']:
 out,_=run(['ffmpeg','-v','error','-i',str(p/(name+'.mp4')),'-f','framemd5','-']);(p/(name+'.framemd5')).write_bytes(out);frames.append([l for l in out.decode().splitlines() if not l.startswith('#')])
assert frames[0]==frames[1] and len(frames[0])==60
streams=[]
for name in ['overstated','candidate']:
 out,_=run(['ffprobe','-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=pts,pkt_dts,pict_type','-of','json',str(p/(name+'.mp4'))]);streams.append(json.loads(out)['frames'])
assert streams[0]==streams[1]
(p/'results.json').write_text(json.dumps({'certificate':c,'negative':neg,'frames':60,'types':{k:sum(f['pict_type']==k for f in streams[0]) for k in ['I','P','B']},'sameFrameHashes':True,'sameFrameTimingTypes':True,'allNonSPSNALsIdentical':True,'candidateSPSRestoresOriginalExactly':True,'sourceSHA':hashlib.sha256((p/'overstated.h264').read_bytes()).hexdigest(),'scope':'Pinned progressive baseline I/P short-term no-list-reorder noMMCO stream. Conservative syntax certificate, not arbitrary H264 reference-liveness proof. No memory/performance claim.'},indent=2));(p/'commands.json').write_text(json.dumps(commands,indent=2));print(c['assertions'],neg['assertions'])
