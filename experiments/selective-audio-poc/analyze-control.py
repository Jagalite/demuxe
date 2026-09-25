# SPDX-License-Identifier: Apache-2.0
"""Summarize recorded clock observations without replaying browser tests."""
import json,statistics,sys
from pathlib import Path
file=Path(sys.argv[1]);j=json.loads(file.read_text());phases=j.get('results',j.get('phases',[]));samples=j['samples'];rows=[];before=0
for phase in phases:
 state=phase['state'];end=state['clock']['at'];subset=[s for s in samples if before<s['at']<=end and s['errorMs'] is not None and s['audioObservationAgeMs']<500]
 presented=[]
 for s in subset:
  t=s.get('lastFrameExpectedDisplayTime');m=s.get('lastFrameMediaTime')
  if t is None or m is None or abs(s['at']-t)>50:continue
  estimated=m+max(0,s['at']-t)*s['videoRate']/1000
  presented.append((s['mpvClockEstimate']-estimated)*1000)
 rows.append({'phase':phase.get('label',phase.get('name')),'samples':len(subset),
  'clockCurrentTimeMaxAbsMs':max((abs(s['errorMs']) for s in subset),default=None),
  'clockCurrentTimeMedianMs':statistics.median(s['errorMs'] for s in subset) if subset else None,
  'frameCallbackSamples':len(presented),'clockPresentedFrameMaxAbsMs':max(map(abs,presented),default=None),
  'clockPresentedFrameMedianMs':statistics.median(presented) if presented else None,
  'endVideoTime':state['position'],'endMpvTime':state['mpv']['position'],
  'totalCorrections':len(state['corrections']),'totalVideoDrops':state['video']['dropped'],
  'totalUnderruns':state['audioOutput']['underruns']})
 before=end
out={'source':str(file),'method':'Mpv time-pos extrapolated to sample wall time. Compared with video currentTime and with requestVideoFrameCallback mediaTime advanced from expectedDisplayTime for observations within 50ms. Neither is an acoustic measurement of the speaker signal.','phases':rows}
file.with_name('analysis.json').write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps(rows,indent=2))
