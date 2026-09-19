# SPDX-License-Identifier: Apache-2.0
import json,pathlib,sys,math
out=pathlib.Path(sys.argv[1]);a=json.load(open('results/top100/heic/input.json'));b=json.load(open(out/'capture.json'))
N=512*512;rows=[]
for tile,row in zip(a['tiles'],b['probe']['rows']):
 src=tile['oracle'];dst=row['planar'];stats=[]
 for c,(start,end,scale,bias) in enumerate([(0,N,219/255,16),(N,N+N//4,224/255,128-128*224/255),(N+N//4,N*3//2,224/255,128-128*224/255)]):
  pairs={};error=[];inv=[]
  for i in range(start,end):
   expected=round(src[i]*scale+bias);error.append(abs(dst[i]-expected));inv.append(abs(round((dst[i]-bias)/scale)-src[i]));pairs.setdefault(dst[i],set()).add(src[i])
  collisions=[{'browserCode':k,'hostCodes':sorted(v)} for k,v in pairs.items() if len(v)>1]
  stats.append({'plane':'YUV'[c],'rangeTransformMaxError':max(error),'rangeTransformMeanError':sum(error)/len(error),'rangeTransformExactFraction':error.count(0)/len(error),'inverseRangeMaxError':max(inv),'inverseRangeExactFraction':inv.count(0)/len(inv),'manyToOneCodeBins':len(collisions),'collisionExamples':collisions[:5]})
 # Independent declared display signal oracle: same nearest-neighbor chroma reconstruction
 # and BT.601 matrix for both representations. This is not OS color management.
 def rgb(y,u,v):return [max(0,min(255,round(y+1.402*v))),max(0,min(255,round(y-.344136*u-.714136*v))),max(0,min(255,round(y+1.772*u)))]
 total=0;maximum=0;changed=0;count=0;wrong=0
 for y in range(0,512,4):
  for x in range(0,512,4):
   q=y*512+x;c=(y//2)*256+x//2
   ref=rgb(src[q],src[N+c]-128,src[N+N//4+c]-128)
   cand=rgb((dst[q]-16)*255/219,(dst[N+c]-128)*255/224,(dst[N+N//4+c]-128)*255/224)
   bad=rgb((dst[q]-16)*255/219,(dst[N+N//4+c]-128)*255/224,(dst[N+c]-128)*255/224)
   errors=[abs(i-j) for i,j in zip(ref,cand)];maximum=max(maximum,*errors);total+=sum(errors);changed+=ref!=cand;count+=3;wrong+=sum(abs(i-j) for i,j in zip(ref,bad))
 rows.append({'index':tile['index'],'format':row['format'],'colorSpace':row['colorSpace'],'planes':stats,'displaySignalSample':{'samples':count//3,'sampling':'every fourth x and y; fixed before calculation','maxChannelError':maximum,'meanAbsoluteChannelError':total/count,'changedPixels':changed,'wrongUVMeanAbsoluteChannelError':wrong/count,'oracle':'independent host YUV; declared BT.601 matrix, nearest chroma, full vs limited range; not color-managed browser screenshot'}})
result={'strictRawPassed':b['strictRawPassed'],'rows':rows,'conclusion':'All strict raw hashes fail. Inverse limited-range conversion is not exact; observed many-to-one luma code mappings demonstrate loss for pointwise range correction. Independent display-signal comparison also differs. Stop this exact-pixel variant; display-tolerance viewer profile would require a separately declared contract and actual color-managed oracle, not silently relaxed acceptance.','candidateExecuted':True,'fallback':False,'performance':'not_applicable: exact fidelity failed'}
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'strictRawPassed':result['strictRawPassed'],'rows':[{'index':r['index'],'Y':r['planes'][0],'display':r['displaySignalSample']} for r in rows]},indent=2))
