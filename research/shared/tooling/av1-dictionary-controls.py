# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,struct,subprocess,hashlib,json,time
out=pathlib.Path(sys.argv[1]);data=(out/'dictionary.ivf').read_bytes();packets=[];at=32
while at<len(data):n,t=struct.unpack_from('<IQ',data,at);packets.append(data[at+12:at+12+n]);at+=12+n
assert len(packets)==3
# Pinned trace independently exposes timing/frame-ID/order-hint disabled and refresh masks2,4.
trace=(out/'trace.log').read_text();assert 'frame_id_numbers_present_flag' in trace and 'refresh_frame_flags                                  00000010 = 2' in trace and 'refresh_frame_flags                                  00000100 = 4' in trace
order=[0,1,2]+[1,2]*100
recalls=[b'\x12\x00\x1a\x01'+bytes([0x88|(index<<4)]) for index in order[3:]]
def ivf(ps):
 h=bytearray(data[:32]);struct.pack_into('<I',h,24,len(ps));return bytes(h)+b''.join(struct.pack('<IQ',len(p),i)+p for i,p in enumerate(ps))
(out/'recall.ivf').write_bytes(ivf(packets+recalls));(out/'bad-key-recall.ivf').write_bytes(ivf(packets+[b'\x12\x00\x1a\x01\x88']));(out/'missing-slot.ivf').write_bytes(ivf([packets[0],recalls[0]]))
def dec(p):return subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(p),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],timeout=30)
raw=dec(out/'dictionary.ivf');assert len(raw)==3*23040;oracle=b''.join(raw[i*23040:(i+1)*23040] for i in order);actual=dec(out/'recall.ivf');assert actual==oracle
# Source-YUV oracle is separately authored; codec roundtrip is lossless.
y4m=(out/'source.y4m').read_bytes();start=y4m.index(b'\n')+1;frames=[]
while start<len(y4m):assert y4m[start:start+6]==b'FRAME\n';frames.append(y4m[start+6:start+6+23040]);start+=6+23040
assert b''.join(frames)==raw
with (out/'repeat.y4m').open('wb') as f:
 f.write(y4m[:y4m.index(b'\n')+1])
 for i in order:f.write(b'FRAME\n'+frames[i])
controls={}
for n in ['bad-key-recall','missing-slot']:
 p=subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(out/(n+'.ivf')),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-'],capture_output=True,timeout=30);expected=b''.join(frames)+(frames[1] if n=='bad-key-recall' else b'') if n=='bad-key-recall' else frames[0]+frames[1];controls[n]={'decoderExit':p.returncode,'wrongOutputDetected':p.stdout!=expected,'outputFrames':len(p.stdout)//23040,'stderr':p.stderr.decode()};assert p.stdout!=expected
(out/'input.json').write_text(json.dumps({'packets':[{'bytes':list(p),'timestamp':round(i*1000000/24),'key':i==0} for i,p in enumerate(packets+recalls)],'order':order,'hashes':[hashlib.sha256(x).hexdigest() for x in frames],'controls':controls,'framesExact':len(order)},indent=2)+'\n')
cmd=['build/catalogue-tools/aom-build/aomenc','--ivf','--passes=1','--cpu-used=8','--lag-in-frames=0','--enable-order-hint=0','--kf-max-dist=999','--lossless=1'];times={}
for name,src in [('ordinary','repeat.y4m'),('dictionary-cost','source.y4m')]:
 t=time.perf_counter()
 with (out/(name+'-encode.log')).open('wb') as f:subprocess.run(cmd+['-o',str(out/(name+'.ivf')),str(out/src)],stdout=f,stderr=f,check=True,timeout=30)
 times[name]=(time.perf_counter()-t)*1000
assert dec(out/'ordinary.ivf')==oracle
r={'passed':True,'framesExact':len(order),'controls':controls,'prepareMs':times,'bytes':{n:(out/(n+'.ivf')).stat().st_size for n in ['ordinary','recall','dictionary']},'plan':'Actual legal non-key stored references, slots1/2;203losslesspictures and source timestamps. Compare ordinary coded sequence, coded recall, and cheapest application retained dictionary. Include measured cold preparation; require>=20percent bytes saved against ordinary plus complete cost<=1.10times application-cache route. Seven alternating browser jobs; no opaque physical decoder-memory inference.'};(out/'result.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
