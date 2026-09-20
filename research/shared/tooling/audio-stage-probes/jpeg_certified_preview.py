# SPDX-License-Identifier: Apache-2.0
import sys,pathlib,math,json,subprocess,time,statistics,hashlib,struct
sys.path.insert(0,'/tmp/demuxe-audio-numeric')
import numpy as np
B=np.array([[math.cos((2*x+1)*u*math.pi/16)*(.5/math.sqrt(2)if u==0 else .5)for u in range(8)]for x in range(8)],np.float64);TERMS=np.array([np.outer(B[:,v],B[:,u])for v in range(8)for u in range(8)]);WEIGHTS=np.max(np.abs(TERMS),axis=(1,2));ZIG=[0,1,8,16,9,2,3,10,17,24,32,25,18,11,4,5,12,19,26,33,40,48,41,34,27,20,13,6,7,14,21,28,35,42,49,56,57,50,43,36,29,22,15,23,30,37,44,51,58,59,52,45,38,31,39,46,53,60,61,54,47,55,62,63]
def quant(raw):
 at=2
 while at<len(raw):
  marker=raw[at+1];size=int.from_bytes(raw[at+2:at+4],'big');data=raw[at+4:at+2+size];at+=2+size
  if marker==219:
   if len(data)!=65 or data[0]!=0:raise ValueError('single8bit quantizer')
   q=np.empty(64,dtype=np.float64)
   for i,value in enumerate(data[1:]):q[ZIG[i]]=value
   return q
 raise ValueError('quantizer')
def coeff(source,name,identity):
 path=source/(name+'.jpg');raw=path.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=identity:raise ValueError('identity')
 values=subprocess.check_output([str(source/'oracle'),'c',str(path)]);return np.frombuffer(values,dtype=np.int16).astype(np.float64).reshape(-1,64)*quant(raw)
def pixels(blocks):return np.clip(np.floor(blocks+128+.5),0,255).astype(np.uint8).reshape(16,16,8,8).transpose(0,2,1,3).reshape(128,128)
def reference(c):return pixels(np.matmul(np.matmul(B,c.reshape(-1,8,8)),B.T))
def candidate(c,budget=2.):
 if budget<1.00000001 or not np.all(np.isfinite(c)):raise ValueError('budget/finite')
 rendered=[];bounds=[];omitted=0;total=0
 for block in c:
  contributions=np.abs(block)*WEIGHTS;fp=1e-12+(1024*np.finfo(float).eps/(1-1024*np.finfo(float).eps))*float(contributions.sum());keep=block!=0;bound=0.
  for index in np.argsort(contributions):
   if not keep[index]:continue
   if bound+contributions[index]<=budget-1.-fp:bound+=contributions[index];keep[index]=False;omitted+=1
  image=np.zeros((8,8),np.float64)
  for i in np.nonzero(keep)[0]:image+=block[i]*TERMS[i]
  rendered.append(image);bounds.append(bound+1.+fp);total+=np.count_nonzero(block)
 return pixels(np.array(rendered)),np.array(bounds),omitted,total
p=pathlib.Path(sys.argv[1]);source=pathlib.Path(sys.argv[2]);p.mkdir(parents=True,exist_ok=True);names=[f'frame{i}'for i in range(4)];ids={n:hashlib.sha256((source/(n+'.jpg')).read_bytes()).hexdigest()for n in names};rows=[];outputs={}
(p/'protocol.json').write_text(json.dumps({'scope':'Real JPEG quantized coefficient adapter from independent libjpeg; explicitly selected double-precision8x8 IDCT consumer with nearest floor(x+0.5) and8bit clamp. Per-block omission certificate sums max absolute omitted basis contributions plus1 rounding and gamma1024*absolute-term-sum+1e-12 floating allowance, requested2 code-value pixel budget. This does NOT certify arbitrary browser/native JPEG IDCT.','cost':'Five alternating four-image cold JPEGread/hash/libjpeg coefficient parse/quantizer/modeled reconstruction/output versus identical coefficient setup and optimized batched full double IDCT. Candidate actually omits selected nonzero terms; <=0.9median. Existing Python/numeric runtime equally reused.'},indent=2))
for name in names:
 c=coeff(source,name,ids[name]);ref=reference(c);out,bounds,omitted,total=candidate(c);err=np.abs(out.astype(int)-ref.astype(int));blockerr=err.reshape(16,8,16,8).transpose(0,2,1,3).reshape(-1,8,8).max(axis=(1,2));assert np.all(blockerr<=bounds)and max(bounds)<=2.;native=np.frombuffer((source/(name+'.gray')).read_bytes(),np.uint8).reshape(128,128);row={'name':name,'maxPixelError':int(err.max()),'maxCertificate':float(bounds.max()),'maxErrorCertificateRatio':float(np.max(blockerr/bounds)),'omittedNonzeroTerms':omitted,'originalNonzeroTerms':int(total),'nativeJPEGObservedDifference':int(np.max(np.abs(out.astype(int)-native.astype(int))))};rows.append(row);outputs[name]=out.tobytes();(p/(name+'.candidate.gray')).write_bytes(out.tobytes());(p/(name+'.reference.gray')).write_bytes(ref.tobytes());(p/(name+'.certificates.f64')).write_bytes(bounds.tobytes())
assert any(row['maxPixelError']>0 for row in rows);controls={'zeroCertificateWouldFail':True}
try:coeff(source,names[0],'wrong');controls['sourceIdentity']=False
except ValueError:controls['sourceIdentity']=True
try:candidate(c,.5);controls['impossibleBudget']=False
except ValueError:controls['impossibleBudget']=True
wrong=c.copy();wrong[:,0]=0;controls['unchargedDCOmissionDiffers']=not np.array_equal(reference(wrong),reference(c));assert all(controls.values());times={'candidate':[],'baseline':[]}
for trial in range(5):
 for mode in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns()
  for name in names:
   c=coeff(source,name,ids[name]);out=candidate(c)[0]if mode=='candidate'else reference(c);(p/'timed.gray').write_bytes(out.tobytes())
   if mode=='candidate':assert out.tobytes()==outputs[name]
  times[mode].append((time.perf_counter_ns()-start)/1e6)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'results.json').write_text(json.dumps({'rows':rows,'controls':controls,'contract':'Only declared double IDCT consumer is certified; native JPEG differences are empirical observations only'},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/jpeg_certified_preview.py '+str(p)+' '+str(source)+'\n');print(rows,med,ratio)
