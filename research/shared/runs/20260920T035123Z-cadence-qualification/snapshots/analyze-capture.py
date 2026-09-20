# SPDX-License-Identifier: Apache-2.0
"""Match independently decoded source pixels to completed WindowServer display frames."""
import json,statistics,sys
from pathlib import Path
p=Path(sys.argv[1]);r=json.loads((p/'results.json').read_text());captures=[json.loads(l) for l in (p/'captured.jsonl').read_text().splitlines()];oracle=json.loads((p.parent/'independent-ffmpeg-oracle.json').read_text())['oracle'];matches=[];invalid=[]
for c in captures:
 if max(c['grid'])<5:continue
 distances=[sum(abs(a-b) for a,b in zip(o['grid'],c['grid']))/len(c['grid']) for o in oracle];order=sorted(range(len(distances)),key=distances.__getitem__);index=order[0];error=distances[index];margin=distances[order[1]]-error
 rec={'captureIndex':c['index'],'sourceIndex':index,'sourcePTSUs':oracle[index]['pts'],'displayUs':c['displayTime']*c['timebaseNumer']/c['timebaseDenom']/1000,'meanLumaError':error,'nextWrongMargin':margin,'status':c['status']}
 if error>2 or margin<5 or c['status']!=0:invalid.append(rec)
 else:matches.append(rec)
changes=[]
for m in matches:
 if not changes or changes[-1]['sourceIndex']!=m['sourceIndex']:changes.append(m)
expected=12 if r['mode']=='cancel' else 72
ids=[m['sourceIndex'] for m in changes];ordered=ids==list(range(expected));warm=[m for m in changes if m['sourceIndex']>=6];phases=[m['displayUs']-m['sourcePTSUs'] for m in warm];offset=statistics.median(phases);errors=[abs(x-offset) for x in phases];slope=(warm[-1]['displayUs']-warm[0]['displayUs'])/(warm[-1]['sourcePTSUs']-warm[0]['sourcePTSUs']) if len(warm)>1 else 0
trace=json.loads((p/'source-issue-events.json').read_text())['events'];issued={int(e['name'].split('-')[1]):e['ts'] for e in trace if e['name'].startswith('SOURCE-')};lags=[m['displayUs']-issued[m['sourceIndex']] for m in changes if m['sourceIndex'] in issued];cleanup=r['execution']['issued']==r['execution']['closed']==expected and r['execution']['sourceFramesClosed']==72 and r['execution']['trackEnded'] and max(captures[-1]['grid'])<5
out={'mode':r['mode'],'captures':len(captures),'sourceFramesIdentified':len(set(ids)),'sourceOrder':ids,'expectedFrames':expected,'exactExpectedOrder':ordered,'invalidNonblackCaptures':invalid,'maxMeanLumaError':max(m['meanLumaError'] for m in matches),'minNearestWrongFrameMargin':min(m['nextWrongMargin'] for m in matches),'physicalClockSlope':slope,'speedWithin2Percent':abs(slope-1)<=.02,'phaseP95AbsMs':sorted(errors)[int(.95*(len(errors)-1))]/1000,'phaseRMSMs':(statistics.mean(e*e for e in errors)**.5)/1000,'sourceToDisplayMedianMs':statistics.median(lags)/1000 if lags else None,'sourceToDisplayP95Ms':sorted(lags)[int(.95*(len(lags)-1))]/1000 if lags else None,'cleanupPassed':cleanup,'physicalCorrectnessPassed':ordered and not invalid and abs(slope-1)<=.02 and cleanup,'changes':changes,'cancelControlPassed':r['mode']=='cancel' and ordered and not invalid and cleanup,'oracle':'Independent host FFmpeg VP8 RGB24 decoded source; matched source PTS and spatial luma grid', 'observer':'ScreenCaptureKit included ownedwindow on actual display; completed status0 and mach displayTime. Actual WindowServer composition, not predicted Chrome feedback, photons, or overlaypromotion. Both candidates pay same capture overhead.'}
(p/'physical-result.json').write_text(json.dumps(out,indent=2)+'\n');print({k:v for k,v in out.items() if k not in ('changes','sourceOrder','invalidNonblackCaptures','observer')})
