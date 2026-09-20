# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,re,hashlib,sys
p=pathlib.Path(sys.argv[1]);cmds=[]
def run(c,allow=False):
 cmds.append(c);r=subprocess.run(c,capture_output=True)
 if not allow:assert r.returncode==0,r.stderr.decode()
 return r
run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=s=160x96:r=24:d=1','-c:v','libx264','-profile:v','baseline','-x264-params','ref=1:weightp=0:bframes=0:keyint=24:min-keyint=24:scenecut=0:slices=1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-f','h264',str(p/'source.h264')])
source=(p/'source.h264').read_bytes()
def split(b):
 m=list(re.finditer(b'\x00\x00(?:\x00)?\x01',b));return [b[x.end():(m[i+1].start() if i+1<len(m) else len(b))] for i,x in enumerate(m)]
def rbsp(b):
 o=bytearray();z=0
 for v in b:
  if z==2 and v==3:z=0;continue
  o.append(v);z=z+1 if v==0 else 0
 return bytes(o)
def escape(b):
 o=bytearray();z=0
 for v in b:
  if z==2 and v<=3:o.append(3);z=0
  o.append(v);z=z+1 if v==0 else 0
 return bytes(o)
nals=split(source);headers=[n for n in nals if n[0]&31 in [7,8]];vcl=[n for n in nals if n[0]&31 in [1,5]];assert len(vcl)==24
tr=run(['ffmpeg','-v','verbose','-i',str(p/'source.h264'),'-c','copy','-bsf:v','trace_headers','-f','null','-']);(p/'source-trace.log').write_bytes(tr.stderr);fields={}
for line in tr.stderr.decode().splitlines():
 m=re.search(r'\]\s+\d+\s+(\w+(?:\[\d+\])?)\s+[01]+\s+=\s+(-?\d+)',line)
 if m:fields.setdefault(m[1],[]).append(int(m[2]))
for key,value in [('profile_idc',66),('chroma_format_idc',1),('frame_mbs_only_flag',1),('pic_order_cnt_type',2),('max_num_ref_frames',1),('entropy_coding_mode_flag',0),('weighted_pred_flag',0),('num_ref_idx_l0_default_active_minus1',0),('ref_pic_list_modification_flag_l0',0),('adaptive_ref_pic_marking_mode_flag',0),('long_term_reference_flag',0),('first_mb_in_slice',0),('redundant_pic_cnt_present_flag',0),('bottom_field_pic_order_in_frame_present_flag',0)]:
 if key=='chroma_format_idc' and key not in fields:continue # inferred1 in baseline SPS
 assert key in fields and all(x==value for x in fields[key]),(key,fields.get(key))
assert all(x%5 in [0,2] for x in fields['slice_type']);assert fields['frame_num']==list(range(16))+list(range(8));bitsnum=fields['log2_max_frame_num_minus4'][0]+4
raw=run(['ffmpeg','-v','error','-i',str(p/'source.h264'),'-pix_fmt','yuv420p','-f','rawvideo','-']).stdout;framebytes=160*96*3//2;assert len(raw)==24*framebytes;reference=raw[framebytes:2*framebytes];(p/'reference-P1.yuv').write_bytes(reference)
class Writer:
 def __init__(self):self.bits=''
 def u(self,n,v):self.bits+=f'{v:0{n}b}'
 def ue(self,v):s=bin(v+1)[2:];self.bits+='0'*(len(s)-1)+s
 def se(self,v):self.ue(-2*v if v<=0 else 2*v-1)
 def align(self):self.bits+='0'*((-len(self.bits))%8)
 def byte(self,v):self.u(8,v)
 def finish(self):self.bits+='1';self.align();return bytes(int(self.bits[i:i+8],2) for i in range(0,len(self.bits),8))
def seed(pixels):
 w=Writer();w.ue(0);w.ue(2);w.ue(0);w.u(bitsnum,0);w.ue(0);w.u(1,0);w.u(1,0);w.se(0);w.ue(1)
 for my in range(6):
  for mx in range(10):
   w.ue(25);w.align()
   for row in range(16):
    start=(my*16+row)*160+mx*16
    for v in pixels[start:start+16]:w.byte(v)
   for plane in range(2):
    for row in range(8):
     start=160*96+plane*80*48+(my*8+row)*80+mx*8
     for v in pixels[start:start+8]:w.byte(v)
 return b'\x65'+escape(w.finish())
def patch(n):
 b=''.join(f'{v:08b}' for v in rbsp(n[1:]));i=0
 def ue():
  nonlocal i
  z=0
  while b[i]=='0':i+=1;z+=1
  i+=1;v=(1<<z)-1+int('0'+b[i:i+z],2);i+=z;return v
 assert ue()==0;assert ue()%5==0;assert ue()==0;old=int(b[i:i+bitsnum],2);new=(old-1)% (1<<bitsnum);fixed=b[:i]+f'{new:0{bitsnum}b}'+b[i+bitsnum:];assert b[i+bitsnum:]==fixed[i+bitsnum:]
 return bytes([n[0]])+escape(bytes(int(fixed[j:j+8],2) for j in range(0,len(fixed),8))),{'old':old,'new':new,'headerBitOffset':i,'allOtherRBSPBitsIdentical':True}
patched=[patch(n) for n in vcl[2:]];s=seed(reference);s0=seed(bytes(len(reference)));join=lambda ns:b''.join(b'\x00\x00\x00\x01'+n for n in ns)
variants={'candidate':headers+[s]+[n for n,r in patched],'unshifted':headers+[s]+vcl[2:],'wrong-pixels':headers+[s0]+[n for n,r in patched],'missing-seed':headers+[n for n,r in patched]}
for name,ns in variants.items():(p/(name+'.h264')).write_bytes(join(ns))
results={}
for name in variants:
 r=run(['ffmpeg','-v','warning','-i',str(p/(name+'.h264')),'-pix_fmt','yuv420p','-f','rawvideo','-'],True);(p/(name+'-decode.log')).write_bytes(r.stderr);rbytes=r.stdout;frames=[rbytes[i:i+framebytes] for i in range(0,len(rbytes),framebytes)];wanted=frames[1:] if name!='missing-seed' else frames;expected=[raw[i:i+framebytes] for i in range(2*framebytes,len(raw),framebytes)];results[name]={'decoded':len(frames),'seedExact':frames[0]==reference if frames else False,'suffixExact':wanted==expected,'wantedHashes':[hashlib.sha256(f).hexdigest() for f in wanted],'warning':r.stderr.decode()}
assert results['candidate']['seedExact'] and results['candidate']['suffixExact'];assert not results['wrong-pixels']['suffixExact'] and not results['missing-seed']['suffixExact']
for name in ['source','candidate']:
 run(['ffmpeg','-v','error','-r','24','-i',str(p/(name+'.h264')),'-c','copy','-movflags','+empty_moov+default_base_moof+frag_keyframe',str(p/(name+'.mp4'))])
(p/'results.json').write_text(json.dumps({'variants':results,'fields':fields,'patches':[r for n,r in patched],'seedBytes':len(s),'originalPrefixVCLBytes':sum(len(n) for n in vcl[:2]),'sourceSha256':hashlib.sha256(source).hexdigest(),'scope':'Source-defined160x96CAVLC progressive8bit420 POC2 ref1 weightp0 noB, 22copied entropy payloads; generated I_PCM seed P1 is hidden preroll, sourceP2 onward shown.'},indent=2));(p/'commands.json').write_text(json.dumps(cmds,indent=2));print({k:{a:v for a,v in x.items() if a!='wantedHashes'} for k,x in results.items()})
