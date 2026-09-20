# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,zlib,struct,subprocess,time,statistics,random,hashlib
import numpy as np
p=pathlib.Path(sys.argv[1]);W=H=64;B=16;N=12
(p/'protocol.json').write_text(json.dumps({'scope':'Actual authored zlib ZMBV32bpp 64x64,16x16blocks,12frames; integer3x3box blur clamped edges on BGR0 first3channels. Syntax-derived no-XOR copy certificates admit reuse only when every footprint sample shares the same in-bounds mapping. Independent native FFmpeg/PyAV full-frame decoder oracle. CPU component, no browser/GPU claim.','cost':'11 paired fresh zlib stream/full reconstruction/filter jobs; candidate includes map/certificate/retained previous filtered output. Baseline identical parsed decode plus vectorized full filter. Require upperbootstrap95ratio<1. Source is prepared in memory; no external IO saving claim.'},indent=2))
y,x=np.indices((H,W));base=np.stack([(x*7+y*5)%256,(x*13+y*3)%256,(x*2+y*11)%256,np.zeros_like(x)],axis=2).astype(np.uint8);z=zlib.compressobj();packets=[bytes([1,0,1,1,8,B,B])+z.compress(base.tobytes())+z.flush(zlib.Z_SYNC_FLUSH)];previous=base;authored=[base]
for t in range(1,N):
 motion=bytearray();residual=bytearray();current=np.zeros_like(base)
 for by in range(H//B):
  for bx in range(W//B):
   dx=-4 if bx>0 and t%2 else 0;dy=-4 if by>0 and t%3 else 0;dirty=(bx+by*4)==t%16
   motion.extend([(dx*2+int(dirty))&255,(dy*2)&255]);sy=by*B+dy;sx=bx*B+dx;patch=previous[sy:sy+B,sx:sx+B].copy()
   if dirty:
    delta=np.zeros((B,B,4),np.uint8);delta[::3,::2,:3]=np.array([17,91,203],np.uint8);patch^=delta;residual.extend(delta.tobytes())
   current[by*B:(by+1)*B,bx*B:(bx+1)*B]=patch
 payload=bytes(motion)+bytes(residual);packets.append(bytes([0])+z.compress(payload)+z.flush(zlib.Z_SYNC_FLUSH));authored.append(current);previous=current
for i,b in enumerate(packets):(p/f'{i:02}.packet').write_bytes(b)
# Independently decode actual compressed packets with installed PyAV/FFmpeg.
driver='''import av,pathlib,sys\np=pathlib.Path(sys.argv[1]);c=av.CodecContext.create('zmbv','r');c.width=64;c.height=64\nwith(p/'native.bgr0').open('wb')as f:\n for q in sorted(p.glob('*.packet')):\n  frames=c.decode(av.Packet(q.read_bytes()))\n  for frame in frames:\n   plane=frame.planes[0];b=bytes(plane)\n   for y in range(64):f.write(b[y*plane.line_size:y*plane.line_size+256])\n c.decode(None)\n'''
(p/'native-oracle.py').write_text('# SPDX-License-Identifier: Apache-2.0\n'+driver);subprocess.run(['build/research-webrtc-venv/bin/python',str(p/'native-oracle.py'),str(p)],check=True,capture_output=True);native=np.frombuffer((p/'native.bgr0').read_bytes(),np.uint8).reshape(N,H,W,4);assert np.array_equal(native,np.stack(authored))
def decode(seq):
 infl=zlib.decompressobj();prev=None
 for packet in seq:
  if packet[0]&1:
   if packet[:7]!=bytes([1,0,1,1,8,B,B]):raise ValueError('unsupported profile')
   infl=zlib.decompressobj();raw=infl.decompress(packet[7:]);cur=np.frombuffer(raw,np.uint8).reshape(H,W,4).copy();mx=np.zeros((H,W),np.int16);my=mx.copy();valid=np.zeros((H,W),bool)
  else:
   if prev is None:raise ValueError('no reference')
   raw=infl.decompress(packet[1:]);mv=np.frombuffer(raw[:32],np.int8).reshape(16,2);at=32;cur=np.empty_like(prev);mx=np.empty((H,W),np.int16);my=mx.copy();valid=np.zeros((H,W),bool)
   for k,(a,b)in enumerate(mv):
    dx=int(a)>>1;dy=int(b)>>1;dirty=int(a)&1;xx=k%4*B;yy=k//4*B
    if not(0<=xx+dx<=W-B and 0<=yy+dy<=H-B):raise ValueError('out of profile reference')
    patch=prev[yy+dy:yy+dy+B,xx+dx:xx+dx+B].copy()
    if dirty:patch^=np.frombuffer(raw[at:at+B*B*4],np.uint8).reshape(B,B,4);at+=B*B*4
    cur[yy:yy+B,xx:xx+B]=patch;mx[yy:yy+B,xx:xx+B]=dx;my[yy:yy+B,xx:xx+B]=dy;valid[yy:yy+B,xx:xx+B]=not dirty
   if at!=len(raw):raise ValueError('residual length')
  yield cur,mx,my,valid;prev=cur

def full(a):
 q=np.pad(a[:,:,:3].astype(np.uint16),((1,1),(1,1),(0,0)),mode='edge');out=sum(q[dy:dy+H,dx:dx+W]for dy in range(3)for dx in range(3));return(out//9).astype(np.uint8)
def run(candidate,unsafe=False):
 outputs=[];prev=None;reuse=0
 for a,mx,my,valid in decode(packets):
  if prev is None or not candidate:r=full(a)
  else:
   eligible=valid.copy()
   if not unsafe:
    eligible[[0,-1],:]=False;eligible[:,[0,-1]]=False
    qv=np.pad(valid,1);qx=np.pad(mx,1);qy=np.pad(my,1)
    for dy in range(3):
     for dx in range(3):eligible&=qv[dy:dy+H,dx:dx+W]&(qx[dy:dy+H,dx:dx+W]==mx)&(qy[dy:dy+H,dx:dx+W]==my)
    eligible&=(x+mx>=1)&(x+mx<W-1)&(y+my>=1)&(y+my<H-1)
   yy,xx=np.where(~eligible);pad=np.pad(a[:,:,:3].astype(np.uint16),((1,1),(1,1),(0,0)),mode='edge');r=np.empty((H,W,3),np.uint8);r[yy,xx]=(sum(pad[yy+dy,xx+dx]for dy in range(3)for dx in range(3))//9).astype(np.uint8);ry,rx=np.where(eligible);r[ry,rx]=prev[ry+my[ry,rx],rx+mx[ry,rx]];reuse+=len(ry)
  outputs.append(r);prev=r
 return np.stack(outputs),reuse
baseline,_=run(False);candidate,reused=run(True);wrong,_=run(True,True);assert np.array_equal(candidate,baseline);wrongCount=int(np.count_nonzero(wrong!=baseline));assert wrongCount>0
controls={'mixedMotionOrXorFootprintDetected':wrongCount,'freshOwnerExact':np.array_equal(run(True)[0],baseline)}
try:list(decode(packets[1:]));controls['missingReferenceRejected']=False
except ValueError:controls['missingReferenceRejected']=True
bad=packets.copy();bad[0]=bad[0][:4]+bytes([7])+bad[0][5:]
try:list(decode(bad));controls['wrongProfileRejected']=False
except ValueError:controls['wrongProfileRejected']=True
assert all(controls.values());samples=[]
for trial in range(11):
 row={}
 for mode in ([True,False]if trial%2 else[False,True]):
  start=time.perf_counter_ns();result,_=run(mode);row['candidate'if mode else'baseline']=(time.perf_counter_ns()-start)/1e6;assert np.array_equal(result,baseline)
 samples.append(row)
ratios=[a['candidate']/a['baseline']for a in samples];rng=random.Random(308);boot=sorted(statistics.median(rng.choices(ratios,k=11))for _ in range(10000));result={'nativeFullFramesExact':True,'allFilteredFramesExact':True,'controls':controls,'reusedPixels':reused,'totalPixels':N*H*W,'samplesMS':samples,'ratioMedian':statistics.median(ratios),'bootstrap95':[boot[250],boot[9749]],'performancePassed':boot[9749]<1,'retainedPreviousFilteredBytes':H*W*3,'scope':'CPU controlled ZMBV decoder/filter component. No GPU or production claim. No external source licensed media.'};(p/'results.json').write_text(json.dumps(result,indent=2)+'\n');(p/'filtered.bgr').write_bytes(candidate.tobytes());print(result)
