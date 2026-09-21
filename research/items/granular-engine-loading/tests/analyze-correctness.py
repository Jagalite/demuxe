# SPDX-License-Identifier: Apache-2.0
"""Independent RGB oracle: MAE <= 6; variant MAE <= 2; subtitle >50 changed pixels."""
import json, pathlib, subprocess, os
base=pathlib.Path(__file__).resolve().parents[1]
run=pathlib.Path((base/'active-run.txt').read_text().strip())
def latest(v):
    rows=[p for p in run.glob(f'correctness-chrome-{v}-local-*') if json.loads((p/'result.json').read_text()).get('passed')]
    return sorted(rows)[-1]
def rgb(p):
    return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','rawvideo','-pix_fmt','rgb24','-'])
def mae(a,b):
    assert len(a)==len(b),(len(a),len(b))
    return sum(abs(x-y) for x,y in zip(a,b))/len(a)
candidate=os.environ.get('VARIANT','stripped')
b,l=latest('baseline'),latest(candidate); results={'baseline':str(b),'candidate':str(l),'checks':[],'passed':False}
for second in [1,3]:
    expected=(run/f'fixtures-v2/oracle-{second}.rgb').read_bytes()[:320*60*3]
    pics=[rgb(p/f'frame-{second}.png') for p in [b,l]]
    for name,pic in zip(['baseline',candidate],pics):
        cropped=pic[:len(expected)];error=mae(cropped,expected);negative=mae(cropped,bytes(255-x for x in expected))
        results['checks'].append({'variant':name,'second':second,'oracleMAE':error,'wrongPictureMAE':negative,'passed':error<=6 and negative>6})
    error=mae(*pics);results['checks'].append({'comparison':'baseline-'+candidate,'second':second,'MAE':error,'passed':error<=2})
for name,p in [('baseline',b),(candidate,l)]:
    on,off=rgb(p/'frame-3.png'),rgb(p/'frame-3-no-sub.png')
    changed=sum(any(abs(on[i+c]-off[i+c])>10 for c in range(3)) for i in range(0,len(on),3))
    results['checks'].append({'variant':name,'subtitleChangedPixels':changed,'passed':changed>50})
for name,p in [('baseline',b),(candidate,l)]:
    expected=(run/'fixtures-v2/oracle-3.rgb').read_bytes();pic=rgb(p/'frame-3-no-sub.png');error=mae(pic,expected);negative=mae(pic,bytes(255-x for x in expected))
    results['checks'].append({'variant':name,'fullFrameSubtitleOffMAE':error,'wrongPictureMAE':negative,'passed':error<=6 and negative>6})
results['passed']=all(x['passed'] for x in results['checks'])
(run/'correctness-analysis-v3.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
raise SystemExit(0 if results['passed'] else 1)
