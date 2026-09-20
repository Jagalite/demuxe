# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,statistics
p=pathlib.Path(sys.argv[1]);meta=json.loads((p/'browser-result.json').read_text());w,h=meta['plan']['width'],meta['plan']['height']
def pixels(name):
 r=subprocess.run(['ffmpeg','-v','error','-i',str(p/(name+'.png')),'-pix_fmt','rgb24','-f','rawvideo','-'],capture_output=True,timeout=10);assert r.returncode==0 and len(r.stdout)==w*h*3;return r.stdout
ref=pixels('reference');rows=[]
for phase in range(3):
 b=pixels('phase'+str(phase));diff=[abs(x-y) for x,y in zip(b,ref)];rows.append({'phase':phase,'meanAbsoluteRGBError':sum(diff)/len(ref),'maximumError':max(diff),'changedChannels':sum(x>0 for x in diff),'stddev':statistics.pstdev(b),'exact':b==ref})
replacement=pixels('replacement-committed')==pixels('replacement-reference');progress=rows[0]['meanAbsoluteRGBError']>rows[1]['meanAbsoluteRGBError']>0 and rows[0]['stddev']>10;result={'stages':rows,'replacementExact':replacement,'actualImprovement':progress,'finalExact':rows[2]['exact'],'lifecyclePassed':meta['passed'],'passed':progress and rows[2]['exact'] and replacement and meta['passed'],'scope':'Full native compositor screenshot RGB versus completed reference; no tolerance relaxation. Fresh owner begins empty, avoiding prior complete-image masking. Source final state and provisional state kept distinct.'};(p/'oracle.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
