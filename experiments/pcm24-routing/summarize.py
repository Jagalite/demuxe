# SPDX-License-Identifier: Apache-2.0
import json,statistics
from pathlib import Path
root=Path('results/pcm24-routing')
rows=json.loads((root/'cpu.json').read_text());summary={}
for arm in dict.fromkeys(r['arm'] for r in rows):
    trials=[r for r in rows if r['arm']==arm and r.get('accepted')]
    if not trials:summary[arm]={'accepted':0};continue
    record={'accepted':len(trials),'whole':statistics.median(r['cpu']['oneCorePercent'] for r in trials),'range':[min(r['cpu']['oneCorePercent'] for r in trials),max(r['cpu']['oneCorePercent'] for r in trials)],'roles':{k:statistics.median(r['cpu']['roles'][k] for r in trials) for k in trials[0]['cpu']['roles']},'rounds':[{'round':r['round'],'whole':r['cpu']['oneCorePercent']} for r in trials]}
    if arm=='selective':
        sync=[abs(s['state']['backend']['mpvAudio']['errorMs']) for r in trials for s in r['samples'] if s['state']['backend']['mpvAudio']['errorMs'] is not None];sync.sort()
        record['syncMs']={'p50':statistics.median(sync),'p95':sync[int((len(sync)-1)*.95)],'max':max(sync)}
        record['underruns']=max(s['state']['backend']['mpvAudio']['preEofUnderruns'] for r in trials for s in r['samples'])
        record['mpvVideoTracks']=max(s['state']['backend']['mpvAudio']['mpvVideoTracks'] for r in trials for s in r['samples'])
    if arm.startswith('hybrid'):
        record['audioFrameDeltas']=[r['samples'][-1]['state']['audio']['mediaFrames']-r['samples'][0]['state']['audio']['mediaFrames'] for r in trials]
        record['underrunDeltas']=[r['samples'][-1]['state']['audio']['underruns']-r['samples'][0]['state']['audio']['underruns'] for r in trials]
    summary[arm]=record
if summary.get('hybrid',{}).get('accepted'):
    base=summary['hybrid']['whole']
    for arm,s in summary.items():
        if s.get('accepted'):s['savingVsHybrid']=base-s['whole']
(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
