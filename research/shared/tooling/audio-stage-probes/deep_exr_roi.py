# SPDX-License-Identifier: Apache-2.0
import sys,pathlib,json,hashlib,time,statistics
sys.path.insert(0,'/tmp/demuxe-audio-numeric')
import numpy as np,OpenEXR
W=128;H=128;FRAMES=3

def composite(ch,y,x):
 trans=1.;out=np.zeros(4,dtype=np.float64)
 for i,a in enumerate(ch['A'][y,x]):
  for c,name in enumerate(['R','G','B']):out[c]+=trans*float(ch[name][y,x][i])
  out[3]+=trans*float(a);trans*=1.-float(a)
 return out.astype(np.float32)
def read(path,identity):
 if hashlib.sha256(path.read_bytes()).hexdigest()!=identity:raise ValueError('source identity')
 with OpenEXR.File(str(path),separate_channels=True)as f:
  if f.header()['type']!=OpenEXR.deepscanline:raise ValueError('deep profile')
  ch={k:v.pixels for k,v in f.channels().items()}
  if set(ch)!=set('RGBAZ')or ch['A'].shape!=(H,W):raise ValueError('channels/shape')
  for y in range(H):
   for x in range(W):
    count=len(ch['A'][y,x])
    if count>6 or any(len(ch[k][y,x])!=count for k in ch)or np.any(np.diff(ch['Z'][y,x])<0)or np.any(ch['A'][y,x]<0)or np.any(ch['A'][y,x]>1):raise ValueError('deep sample policy')
  return ch
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);ids=[];originals=[]
(p/'protocol.json').write_text(json.dumps({'scope':'Three real OpenEXR deep scanline RGBAZ128x128 frames,1..6 depth-sorted point samples; premultiplied front-to-back composition. Nine32x32ROI views; source-paired retained sample adapter. No volumetric overlapping-segment semantics.','oracle':'Independent scalar float64 front-to-back full composition, compare decoded deep values exactly and CPU/GPU ROI output within2e-6. Wrong frame association, invalid depth order or alpha reject.','cost':'Five alternating full cold EXR read/hash/validate plus deferred9ROI versus eager fullflatten once perframe plus9ROI slices. GPU separately compares same uploaded deep samples with direct ROI versus eager full frame once then ROI gather; include browser/device/pipeline/upload/dispatch/readback/cleanup.'},indent=2))
for frame in range(FRAMES):
 ch={name:np.empty((H,W),dtype=object)for name in 'RGBAZ'}
 for y in range(H):
  for x in range(W):
   count=1+(x*3+y+frame)%6;alpha=np.array([.1+((x+y+i+frame)%7)*.1 for i in range(count)],np.float32);ch['A'][y,x]=alpha;ch['Z'][y,x]=np.arange(count,dtype=np.float32)*.7+.2
   for c,name in enumerate('RGB'):ch[name][y,x]=(alpha*np.array([((x*(c+1)+y+i*13+frame*29)%127)/126 for i in range(count)],np.float32)).astype(np.float32)
 path=p/f'frame{frame}.exr';OpenEXR.File({'type':OpenEXR.deepscanline,'compression':OpenEXR.ZIPS_COMPRESSION},dict(ch)).write(str(path));identity=hashlib.sha256(path.read_bytes()).hexdigest();ids.append(identity);actual=read(path,identity)
 for k in ch:
  for y in range(H):
   for x in range(W):assert np.array_equal(actual[k][y,x],ch[k][y,x])
 originals.append(ch)
views=[{'frame':f,'x':x,'y':y,'w':32,'h':32}for f in range(3)for x,y in[(0,0),(43,29),(96,96)]]
def render(ch,view):return np.stack([composite(ch,y,x)for y in range(view['y'],view['y']+view['h'])for x in range(view['x'],view['x']+view['w'])]).reshape(view['h'],view['w'],4)
reference=np.concatenate([render(originals[v['frame']],v).ravel()for v in views]);(p/'reference.f32').write_bytes(reference.tobytes());offsets=[0];samples=[]
for ch in originals:
 for y in range(H):
  for x in range(W):
   for i in range(len(ch['A'][y,x])):samples.append([ch[k][y,x][i]for k in 'RGBA'])
   offsets.append(len(samples))
(p/'offsets.u32').write_bytes(np.array(offsets,np.uint32).tobytes());(p/'samples.f32').write_bytes(np.array(samples,np.float32).tobytes());(p/'views.json').write_text(json.dumps(views));times={'candidate':[],'baseline':[]}
for trial in range(5):
 for name in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();decoded=[read(p/f'frame{f}.exr',ids[f])for f in range(FRAMES)]
  if name=='candidate':out=np.concatenate([render(decoded[v['frame']],v).ravel()for v in views])
  else:
   flattened=[render(ch,{'x':0,'y':0,'w':W,'h':H})for ch in decoded];out=np.concatenate([flattened[v['frame']][v['y']:v['y']+v['h'],v['x']:v['x']+v['w']].ravel()for v in views])
  ms=(time.perf_counter_ns()-start)/1e6;assert np.array_equal(out,reference);times[name].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'results.json').write_text(json.dumps({'realDeepEXRFrames':3,'deepSamples':len(samples),'views':views,'sourceIDs':ids,'decodedDeepSamplesExact':True,'roiFloats':len(reference),'cpuROIExact':True,'OpenEXR':OpenEXR.__version__,'numpy':np.__version__},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));print(med,ratio)
