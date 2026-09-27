#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Validate the restricted stereo PCM/AudioWorklet campaign, not general audio."""
import argparse,hashlib,json,pathlib

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify(folder):
    r=json.loads((folder/'result.json').read_text())
    assert r['passed']==r['total']==2 and [c['backend'] for c in r['cases']]==['jspi','asyncify']
    build=json.loads((folder/'build.json').read_text());assert build['profile']=='audio' and build['status']=='built_service_only'
    for url,x in r['inputs'].items():
        assert sha(pathlib.Path(x['path']))==x['sha256'],'Live input drift: '+url
        if url.startswith('/experiment/'):assert sha(folder/'sources'/url.removeprefix('/experiment/'))==x['sha256']
        if url.startswith('/candidate/'):assert x['sha256']==build['artifacts'][url.removeprefix('/candidate/')]
    for path,wanted in build['sourceSHA256'].items():assert sha(pathlib.Path(path))==wanted
    for name,wanted in build['dependencyArchives'].items():assert sha(pathlib.Path(build['dependencyBuild'])/name)==wanted
    for c in r['cases']:
        assert c['passed'] and not c['headers'].get('cross-origin-opener-policy') and not c['headers'].get('cross-origin-embedder-policy')
        e=c['evidence'];facts=e['facts'];assert e['sampleRate']==48000
        assert facts['crossOriginIsolated'] is False and facts['sharedArrayBuffer']=='undefined' and facts['memory']=='ArrayBuffer'
        if c['backend']=='asyncify':assert facts['jspi']=='undefined'
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
    return {'verified':True,'browser':r['browser'],'passed':2,'resultSHA256':sha(folder/'result.json'),'scope':r['scope']}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--run',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path);a=p.parse_args();text=json.dumps(verify(a.run),indent=2)+'\n'
    if a.output:
        with a.output.open('x') as f:f.write(text)
    print(text,end='')
