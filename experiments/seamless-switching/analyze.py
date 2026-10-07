# SPDX-License-Identifier: Apache-2.0
"""Analyze pre-speaker PCM and requestVideoFrameCallback evidence; no audible-output claim."""
import array, json, math, pathlib, statistics, sys
out=pathlib.Path(sys.argv[1]); results=[]
def percentile(values,p):
    return sorted(values)[min(len(values)-1,int(len(values)*p))] if values else None
for file in sorted(out.glob('*.json')):
    if file.stem in ('manifest','summary','harness-hashes'):continue
    r=json.loads(file.read_text())
    if 'frames' not in r:continue
    frames=r['frames']; sr=r['audioSampleRate']; blocks=r['audioBlocks']
    audio=array.array('f');audio.frombytes(file.with_suffix('.f32').read_bytes())
    # Initial graph connection can skip clock frames in the first block.
    # Omit it and use the independently tagged second block; never fill gaps.
    omitted_first=False
    if len(blocks)>1 and blocks[1]['frame']!=blocks[0]['frame']+blocks[0]['length']:
        audio=audio[blocks[0]['length']:];blocks=blocks[1:];omitted_first=True
    assert all(b['frame']==a['frame']+a['length'] for a,b in zip(blocks,blocks[1:])), 'Audio capture block missing'
    origin=blocks[0]['frame']/sr if blocks else 0
    # Exclude startup/end; include every scheduled transition.
    lo=max(0,int(((r.get('audioStart',origin)+1)-origin)*sr))
    hi=min(len(audio),int(((r.get('audioEnd',origin+len(audio)/sr))-.2-origin)*sr))
    zeros=[];start=None
    for i in range(lo,hi):
        if abs(audio[i])<1e-5:
            if start is None:start=i
        elif start is not None:
            if i-start>=sr*.005:zeros.append({'audioTime':origin+start/sr,'ms':(i-start)/sr*1000})
            start=None
    if start is not None and hi-start>=sr*.005:zeros.append({'audioTime':origin+start/sr,'ms':(hi-start)/sr*1000})
    max_delta=max((abs(audio[i]-audio[i-1]) for i in range(lo+1,hi)),default=0)
    # Residual carrier phase across 10 ms windows. This detects phase breaks,
    # not integer-cycle skips; the periodic sine is NOT a unique audio timecode.
    n=480;cos=[math.cos(2*math.pi*997*i/sr) for i in range(n)];sin=[math.sin(2*math.pi*997*i/sr) for i in range(n)]
    phase_events=[];previous=None
    for start in range(lo,hi-n,n):
        chunk=audio[start:start+n];rms=math.sqrt(sum(x*x for x in chunk)/n)
        if rms<.01:previous=None;continue
        phase=math.atan2(sum(x*c for x,c in zip(chunk,cos)),sum(x*s for x,s in zip(chunk,sin)))-2*math.pi*997*start/sr
        if previous is not None:
            delta=math.atan2(math.sin(phase-previous),math.cos(phase-previous))
            if abs(delta)>.15:phase_events.append({'audioTime':origin+start/sr,'radians':delta})
        previous=phase
    selected=[f for f in frames if f['media']>=1 and f['media']<=27.8]
    wall=[b['expected']-a['expected'] for a,b in zip(selected,selected[1:])]
    media=[(b['media']-a['media'])*1000 for a,b in zip(selected,selected[1:])]
    switches=[]
    for sw in r['switches']:
        presented=next((f for f in frames if f['wall']>=sw['wall'] and f['marker']==sw['id']),None)
        prior=next((f for f in reversed(frames) if f['wall']<sw['wall']),None)
        switches.append({'target':sw['id'],'alreadyPresentedAtRequest':bool(prior and prior['marker']==sw['id']),'bufferedSeconds':sw['buffered'],'presentationDelayMs':None if presented is None else presented['wall']-sw['wall'],'commitSkewMs':None if 'commitSkew' not in sw else sw['commitSkew']*1000})
    first_switch=r['switches'][0]['audio'] if r['switches'] else math.inf
    results.append({'name':file.stem,'errors':r['errors'],'omittedFirstAudioBlock':omitted_first,'route':r.get('route','HTMLVideoElement files'),'frames':len(frames),'maxVideoIntervalMs':max(wall,default=0),'p99VideoIntervalMs':percentile(wall,.99),'minMediaStepMs':min(media,default=0),'maxMediaStepMs':max(media,default=0),'audioSilencesOver5ms':zeros,'audioSilencesAfterFirstRequest':[z for z in zeros if z['audioTime']>=first_switch],'audioMaxSampleDelta':max_delta,'audioPhaseEvents':phase_events,'switches':switches,'callbackCount':len(r.get('decisions',[])),'callbackIdsMatchPublicState':all(d['idsMatchPublicState'] for d in r.get('decisions',[])),'activeWaitingEvents':[e for e in r['events'] if e['type']=='waiting' and e['active'] and e['media']>1]})
(out/'summary.json').write_text(json.dumps(results,indent=2)+'\n')
lines=['# Switching experiment results','','Pre-speaker mono PCM and browser frame callbacks; one run per case unless separately recorded.','','| Case | Max frame interval | Audio silence ≥5 ms | Phase anomalies | Switch presentation delay | Errors |','|---|---:|---:|---:|---|---:|']
for r in results:
    delays=', '.join('missing' if s['presentationDelayMs'] is None else f"{s['presentationDelayMs']:.0f} ms" for s in r['switches'])
    lines.append(f"| {r['name']} | {r['maxVideoIntervalMs']:.1f} ms | {len(r['audioSilencesOver5ms'])} | {len(r['audioPhaseEvents'])} | {delays or 'baseline'} | {len(r['errors'])} |")
lines+=['','Raw JSON retains per-frame marker, media timestamp, compositor estimate, worklet frame indexes, switch requests, and errors. PCM is float32 at the recorded sample rate.','', 'Limits: requestVideoFrameCallback does not prove physical display timing; worklet PCM does not prove speaker output. The periodic 997 Hz tone detects silence and phase breaks but cannot identify integer-cycle skips. The latency case delays each segment response by 350 ms; it is not bandwidth throttling. No cross-browser, HEVC/HDR, PiP, live, or decoder-budget qualification.']
(out/'REPORT.md').write_text('\n'.join(lines)+'\n')
print('\n'.join(lines[:len(results)+6]))
