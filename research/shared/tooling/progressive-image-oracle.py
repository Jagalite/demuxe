# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,statistics
p=pathlib.Path(sys.argv[1]);result=json.loads((p/'browser-result.json').read_text());assert result['passed']
def pixels(name):
 r=subprocess.run(['ffmpeg','-v','error','-i',str(p/(name+'.png')),'-pix_fmt','rgb24','-f','rawvideo','-'],capture_output=True,timeout=10);assert r.returncode==0;assert len(r.stdout)==256*192*3;return r.stdout
ref=pixels('reference');rows=[]
for phase in range(3):
 b=pixels('phase'+str(phase));error=sum(abs(x-y) for x,y in zip(b,ref))/len(ref);rows.append({'phase':phase,'meanAbsoluteRGBError':error,'stddev':statistics.pstdev(b),'exact':b==ref})
assert rows[0]['meanAbsoluteRGBError']>rows[1]['meanAbsoluteRGBError']>0 and rows[0]['stddev']>10;assert rows[2]['exact'];assert pixels('replacement-committed')==pixels('replacement-reference');out={'stages':rows,'replacementExact':True,'passed':True,'scope':'Full browser-compositor screenshot samples versus separate completed decode on same native renderer; provisional coarse/refinement must differ from final, final and replacement exact. No canvas intermediate claim.'};(p/'oracle.json').write_text(json.dumps(out,indent=2)+'\n');print(out)
