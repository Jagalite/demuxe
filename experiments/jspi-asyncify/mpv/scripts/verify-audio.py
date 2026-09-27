#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Validate the restricted stereo PCM/AudioWorklet campaign, not general audio."""
import argparse,hashlib,json,pathlib
from evidence import verify_inputs,verify_build,verify_frames
if not __debug__:raise RuntimeError("Evidence verification requires assertions enabled")

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify(folder):
    r=json.loads((folder/'result.json').read_text());assert r['schema']==2
    verify_inputs(folder,r['inputs'],'audio')
    expected={(b,s) for b in ['jspi','asyncify'] for s in ['media','pending-close','active-close','worklet-fault','rate-replacement','suspended-close']}
    actual=[(c['backend'],c['scenario']) for c in r['cases']]
    assert len(actual)==len(set(actual)) and set(actual)==expected
    assert r['passed']==r['total']==len(expected)
    build=json.loads((folder/'build.json').read_text());verify_build(build,'audio');assert build['profile']=='audio' and build['status']=='built_service_only'
    for url,x in r['inputs'].items():
        if url.startswith('/candidate/'):assert x['sha256']==build['artifacts'][url.removeprefix('/candidate/')]
    for c in r['cases']:
        assert c['passed'] and c['headers'].get('cross-origin-opener-policy') is None and c['headers'].get('cross-origin-embedder-policy') is None
        e=c['evidence'];facts=e['facts'];assert e['sampleRate']==(44100 if c['scenario']=='rate-replacement' else 48000)
        assert e['duplicateInitRejected'] and facts['backend']==c['backend']
        assert facts['crossOriginIsolated'] is False and facts['sharedArrayBuffer']=='undefined' and facts['memory']=='ArrayBuffer'
        assert facts['jspi']==facts['jspiPromising']==('undefined' if c['backend']=='asyncify' else 'function')
        cleanup=e['cleanup'];s=cleanup['scheduler'];source=cleanup['source']
        assert all(s[k]==0 for k in ['liveTasks','retainedTasks','waitKeys','timers'])
        assert all(source[k]==0 for k in ['handles','pending','timers'])
        if c['scenario']=='worklet-fault':
            assert e['reuseRejected'] and s['stopped'] and e['stopped']['failed']
        else:
            assert not cleanup['live'] and not cleanup.get('error') and cleanup['maxOutstanding']<=8192
            assert s['created']==s['completed'] and s['suspensions']==s['resumes'] and s['freeSlots']==24 and s['abandoned']==0
        if c['scenario']=='pending-close':
            assert e['observedPending'] and e['loadOutcome']['error'] and 0<=e['closeMs']<1500
            assert source['cancelled']>0 and source['timeouts']==0
        if c['scenario'] in ['pending-close','active-close','worklet-fault','suspended-close']:
            assert e['stopped']['stopped'] and e['stopped']['read']==e['stopped']['written']==0
        if c['scenario']=='rate-replacement':assert e['beforeRate']==e['afterRate']==44100
        if c['scenario']!='media':continue
        assert e['pcm']=={'samples':192000,'maxError':0} and e['replacement']=={'samples':48000,'maxError':0}
        for a,b in [('suspended','suspendedAfter'),('paused','pausedAfter')]:assert e[a]['header'][1]==e[b]['header'][1]
        assert e['paused']['userPaused'] and abs(e['paused']['time']-e['paused']['header'][1]/48000)<.025
        for stage in ['eof','speed','replacementEnd']:
            assert e[stage]['eof'] and e[stage]['header'][0]==e[stage]['header'][1] and e[stage]['chains']==1
        assert e['sought']['epoch']>e['eof']['epoch'] and e['sought']['header'][1]>1024
        assert e['replacementEnd']['epoch']>e['speed']['epoch']
        assert 40000<e['speedFrames']<56000 and 0<e['worklet']['maxQueued']<=8192
        cleanup=e['cleanup'];s=cleanup['scheduler'];source=cleanup['source']
        assert not cleanup['live'] and not cleanup.get('error') and cleanup['maxOutstanding']<=8192 and cleanup['feedbackCount']>0
        assert all(s[k]==0 for k in ['liveTasks','retainedTasks','waitKeys','timers','abandoned'])
        assert s['created']==s['completed'] and s['suspensions']==s['resumes'] and s['freeSlots']==24
        assert all(source[k]==0 for k in ['handles','pending','timers','errors','timeouts'])
    return {'verified':True,'browser':r['browser'],'passed':len(expected),'resultSHA256':sha(folder/'result.json'),'scope':r['scope']}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--run',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path);a=p.parse_args();text=json.dumps(verify(a.run),indent=2)+'\n'
    if a.output:
        with a.output.open('x') as f:f.write(text)
    print(text,end='')
