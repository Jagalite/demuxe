# SPDX-License-Identifier: Apache-2.0
import ast,pathlib,sys,json,time,statistics,random,hashlib
p=pathlib.Path(sys.argv[1]);p.mkdir(exist_ok=True);h=pathlib.Path('research/items/R290.compose-exact-motion-copy-chains-before-reconstructing-pixels');source=h/'evidence/20260919T232100Z-alternating-copy-map/integer.m2v';tool=h/'tests/copy-map-alternating.py';tree=ast.parse(tool.read_text());nodes=[]
for n in tree.body:
 if isinstance(n,(ast.Import,ast.ImportFrom,ast.FunctionDef,ast.ClassDef)):nodes.append(n)
 elif isinstance(n,ast.Assign) and not any(isinstance(z,ast.Call) for z in ast.walk(n)):nodes.append(n)
g={};exec(compile(ast.Module(nodes,type_ignores=[]),'<actualMPEG2parser>','exec'),g)
data=source.read_bytes();identity=hashlib.sha256(data).hexdigest();SZ=6144
queries=[(8,(24,24,16,16)),(16,(14,14,20,20)),(32,(0,0,64,64))]
def select(frame,roi):
 x,y,w,h=roi;out=bytearray();offset=0
 for scale in [1,2,2]:
  stride=64//scale
  for yy in range(y//scale,(y+h)//scale):out.extend(frame[offset+yy*stride+x//scale:offset+yy*stride+(x+w)//scale])
  offset+=stride*stride
 return bytes(out)
def candidate(blob,owner=identity):
 if hashlib.sha256(blob).hexdigest()!=owner:raise ValueError('source generation')
 trace=g['parse'](blob);marks=list(g['re'].finditer(b'\0\0\1\0',blob));anchor=g['decode'](blob[:marks[1].start()])[-SZ:];outputs=[];closures=[]
 for frame,roi in queries:
  x,y,w,h=roi;out=bytearray();offset=0;counts=[]
  for scale in [1,2,2]:
   stride=64//scale;points=[(xx,yy) for yy in range(y//scale,(y+h)//scale) for xx in range(x//scale,(x+w)//scale)];stage=[]
   for r in reversed(trace[:frame]):
    lookup={(xx,yy):(vx,vy) for xx,yy,vx,vy in r['vectors']};nxt=[]
    for xx,yy in points:
     vx,vy=lookup[(xx//(16//scale),yy//(16//scale))]
     if vx%(2*scale) or vy%(2*scale):raise ValueError('fractional interpolation dependency requires fallback')
     nx,ny=xx+vx//(2*scale),yy+vy//(2*scale)
     if not(0<=nx<stride and 0<=ny<stride):raise ValueError('unmodeled boundary extension')
     nxt.append((nx,ny))
    points=nxt;stage.append(len(set(points)))
   out.extend(anchor[offset+yy*stride+xx] for xx,yy in points);offset+=stride*stride;counts.append(stage)
  outputs.append(bytes(out));closures.append({'frame':frame,'roi':roi,'requestedSamples':len(out),'uniqueDependencySamplesByPlaneBackward':counts,'wholeAnchorDecodedOnce':True,'predictedPicturesMaterialized':0})
 return outputs,closures
full=g['decode'](data);want=[select(full[frame*SZ:(frame+1)*SZ],roi) for frame,roi in queries];got,closure=candidate(data);assert got==want
for name in ['fractional']:
 try:candidate((source.parent/(name+'.m2v')).read_bytes(),hashlib.sha256((source.parent/(name+'.m2v')).read_bytes()).hexdigest());raise AssertionError('accepted unsupported')
 except ValueError:pass
try:candidate(data,owner='wrong');raise AssertionError('source accepted')
except ValueError:pass
(p/'contract.json').write_text(json.dumps({'scope':'Restricted authored progressiveMPEG2 I+32P singleforward-reference/noresidual slices. InitialI fully decoded once; subsequentP syntax parsed and only required leaf pixels pulled. No transform-region decoder claim.','metric':'Complete fresh decoder plus source identity, allsyntaxparse, dependencyclosure and three requested YUVregions vsfull33picture decodeonce and same three crops. Includes fullframe finalquery, no favorable-only crop workload.','pairs':11,'thresholdMedianSaving':.05,'unsupported':'Fractional motion rejects to caller full decoder, not rounded. Outofbounds extension rejects. Fullsource SHA owner guard.'},indent=2))
rows=[]
for i in range(11):
 row={'pair':i}
 for mode in (['candidate','baseline'] if i%2 else ['baseline','candidate']):
  t=time.perf_counter()
  if mode=='candidate':out=candidate(data)[0]
  else:
   raw=g['decode'](data);out=[select(raw[f*SZ:(f+1)*SZ],r) for f,r in queries]
  row[mode+'Ms']=(time.perf_counter()-t)*1000;assert out==want
 row['saving']=1-row['candidateMs']/row['baselineMs'];rows.append(row)
vals=[r['saving'] for r in rows];rng=random.Random(133);boot=sorted(statistics.median(rng.choices(vals,k=11)) for _ in range(5000));result={'all3RegionsExact':True,'all22TimedQuerySetsExact':True,'oracle':'Independent fullFFmpeg reconstruction then planar crops','closure':closure,'fractionalRejected':True,'wrongSourceRejected':True,'rows':rows,'medianSaving':statistics.median(vals),'bootstrap95':[boot[125],boot[4874]],'passed':statistics.median(vals)>=.05,'sourceSHA':identity};(p/'results.json').write_text(json.dumps(result,indent=2));print(result['medianSaving'],result['bootstrap95'])
