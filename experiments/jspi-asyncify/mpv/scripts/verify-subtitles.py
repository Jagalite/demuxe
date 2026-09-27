#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Verify exact actual-service coverage and source/artifact correspondence."""
import argparse,hashlib,json,pathlib
REPO=pathlib.Path(__file__).resolve().parents[4]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def verify(folder):
    r=json.loads((folder/'result.json').read_text());assert r['schema']==2
    expected={(f,b,'media') for f in ['m0.mkv','replacement.mkv','movtext.mp4'] for b in ['pthread','jspi','asyncify']}
    expected|={(f,b,'bitmap') for f in ['pgs.mkv','vobsub.mkv'] for b in ['pthread','jspi','asyncify']}
    expected|={('m0.mkv',b,'cancel') for b in ['jspi','asyncify']}
    actual=[(c['fixture'],c['backend'],c['scenario']) for c in r['cases']]
    assert len(actual)==len(set(actual)) and set(actual)==expected,'Missing, extra or duplicate case'
    assert r['passed']==r['total']==len(expected)
    for url,record in r['inputs'].items():
        assert sha(pathlib.Path(record['path']))==record['sha256'],'Live input drift: '+url
        if url.startswith('/experiment/'):
            assert sha(folder/'sources'/url.removeprefix('/experiment/'))==record['sha256'],'Snapshot drift: '+url
    for prefix,name in [('/baseline/','baseline/manifest.json'),('/candidate/','candidate-build.json')]:
        build=json.loads((folder/'provenance'/name).read_text())
        for url,record in r['inputs'].items():
            if url.startswith(prefix):assert build['artifacts'][url.removeprefix(prefix)]==record['sha256']
    candidate=json.loads((folder/'provenance/candidate-build.json').read_text())
    for name,wanted in candidate['sourceSHA256'].items():assert sha(pathlib.Path(name))==wanted,'Link input drift'
    deps=pathlib.Path(candidate['dependencyBuild'])
    for name,wanted in candidate['dependencyArchives'].items():assert sha(deps/name)==wanted,'Archive drift'
    baseline={c['fixture']:c['evidence']['frames'] for c in r['cases'] if c['backend']=='pthread'}
    for c in r['cases']:
        assert c['passed'];e=c['evidence'];f=e['facts'];isolated=c['backend']=='pthread'
        assert c['headers'].get('cross-origin-opener-policy')==('same-origin' if isolated else None)
        assert c['headers'].get('cross-origin-embedder-policy')==('require-corp' if isolated else None)
        assert f['crossOriginIsolated']==f['sharedArrayBufferAvailable']==isolated
        assert f['memoryType']==('SharedArrayBuffer' if isolated else 'ArrayBuffer')
        if not isolated:
            assert c['pthreadPixelIdentity']
            assert e['frames']==(baseline[c['fixture']][:1] if c['scenario']=='cancel' else baseline[c['fixture']])
            s=e['cleanup']['scheduler'];source=e['cleanup']['source']
            assert all(s[k]==0 for k in ['liveTasks','retainedTasks','waitKeys','timers','abandoned'])
            assert s['freeSlots']==24 and s['created']==s['completed'] and s['suspensions']==s['resumes']
            assert all(source[k]==0 for k in ['pending','handles','timers'])
        if c['backend']=='asyncify':assert not f['jspiSuspending'] and not f['jspiPromising']
        if c['scenario']=='cancel':assert e['observedPending']
        if c['scenario']=='bitmap':
            assert e['recoveries']==[{'time':33,'point':0},{'time':33,'point':0}]
            assert e['frames'][2]=={'time':35.6,'empty':True}
    return {'verified':True,'browser':r['browser'],'passed':len(expected),'resultSHA256':sha(folder/'result.json'),'scope':r['scope']}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--run',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path);a=p.parse_args();r=verify(a.run)
    text=json.dumps(r,indent=2)+'\n'
    if a.output:
        with a.output.open('x') as f:f.write(text)
    print(text,end='')
