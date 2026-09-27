#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Check local evidence correspondence; never changes the original package manifest."""
import argparse,hashlib,json,pathlib,re

ROOT=pathlib.Path(__file__).resolve().parents[3]
EXP=ROOT/'experiments/jspi-asyncify'
RESULTS=ROOT/'results/jspi-asyncify'
OUT=RESULTS/'20260927-01'
BUILDS=pathlib.Path('/Volumes/seed2/Projects/demuxe-jspi-asyncify-builds-20260927')
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(path):return json.loads(path.read_text())
def require(value,message):
    if not value:raise ValueError(message)

BASE_SOURCES={'ffmpeg/tests/media-worker.mjs','ffmpeg/tests/run-media.mjs',
              'ffmpeg/runtime/ffmpeg-bridge.mjs','ffmpeg/runtime/single-owner.mjs','stage2/runtime/range-source.mjs'}
DEFAULT_RUNS=['media-remux-jspi-01','media-remux-asyncify-01','media-transcode-pcm-01','media-transcode-ac3-01']
CONTRACTS=[('remux',['pthread','jspi'],'avc-aac.ts'),('remux',['pthread','asyncify'],'avc-aac.ts'),
           ('transcode',['pthread','jspi','asyncify'],'h264-pcm.mkv'),('transcode',['pthread','jspi','asyncify'],'ac3.mkv')]
def validate_campaign(r,profile,runtimes,fixture):
    version=r.get('schemaVersion',1)
    require(version in (1,2),'Unknown evidence schema')
    expected={}
    for scenario in ['media','cancel','reader-failure','replace','fatal-output']:
        for transport in (['blob','range'] if scenario=='media' else ['range']):
            for target in ([0,2] if scenario=='media' else [0]):
                for runtime in runtimes:
                    if scenario!='media' and runtime=='pthread':continue
                    identity=(profile,scenario,transport,target,runtime)
                    expected['-'.join(map(str,identity))]=identity
    cases=r['cases'];count=len(expected)
    require(r['passed']==count and r['total']==count and len(cases)==count,'Incomplete campaign')
    require({c['id'] for c in cases}==set(expected),'Missing or unexpected case identities')
    require(set(r['engines'])=={profile+'-'+runtime for runtime in runtimes},'Missing or unexpected engines')
    sources=BASE_SOURCES|({'ffmpeg/tests/frozen-inputs.mjs'} if version==2 else set())
    require(set(r.get('sourceSHA256',{}))==sources,'Missing or unexpected source snapshots')
    for c in cases:
        require(tuple(c[k] for k in ['profile','scenario','transport','target','runtime'])==expected[c['id']],'Case fields disagree with identity')
        # The first historical remux run predates the explicit fixture field.
        require(c.get('fixture','avc-aac.ts' if version==1 and profile=='remux' else None)==fixture,'Wrong case fixture')
        facts=c['evidence']['runtimeFacts'];isolated=c['runtime']=='pthread'
        require(facts['runtime']==c['runtime'],'Wrong runtime identity')
        require(facts['crossOriginIsolated'] is isolated and facts['sharedArrayBufferAvailable'] is isolated,'Wrong worker isolation')
        require(facts['memoryType']==('SharedArrayBuffer' if isolated else 'ArrayBuffer'),'Wrong worker memory')
        if version==2:
            headers={'coop':'same-origin' if isolated else None,'coep':'require-corp' if isolated else None}
            require(c['documentHeaders']==headers,'Wrong document COOP/COEP')
            worker=facts['responseHeaders']
            require({'coop':worker.get('cross-origin-opener-policy'),'coep':worker.get('cross-origin-embedder-policy')}==headers,'Wrong worker COOP/COEP')
            require(c['pageIsolation']=={'crossOriginIsolated':isolated,'sharedArrayBufferAvailable':isolated},'Wrong document isolation')
            require(c['sourceSHA256']==r['frozenSHA256']['fixtures/'+fixture],'Wrong frozen fixture')
            if c['scenario']=='replace':
                replacement='h264-pcm.mkv' if profile=='remux' else 'avc-aac.ts'
                require(c['replacementFixture']==replacement and c['replacementSHA256']==r['frozenSHA256']['fixtures/'+replacement],'Wrong replacement identity')
    return count


def main(media_runs=DEFAULT_RUNS,output=None,transcode_attempt='03'):
    summary={'scope':'Chrome component correctness, not Player/MSE integration or release qualification',
             'infrastructure':{},'builds':{},'media':[],'productionRoutingChanged':False,'performanceMeasured':False}
    for name,count in [('local-dual-02.json',94),('local-continuations.json',27)]:
        p=OUT/name;r=read(p)
        require(r.get('passed')==count and r.get('total')==count and len(r['runs'])==count,name+' incomplete')
        require(all(c.get('qualified') is True for c in r['runs']),name+' failed case')
        for source,wanted in r['sourceSHA256'].items():require(digest(EXP/source)==wanted,'Infrastructure source drift: '+source)
        summary['infrastructure'][name]={'passed':count,'browser':r['browser'],'sha256':digest(p)}
    for profile in ['remux','transcode']:
        for backend in ['jspi','asyncify']:
            key=profile+'-'+backend;directory=BUILDS/(key+('-'+transcode_attempt if profile=='transcode' else '-02'));record=read(directory/'build-result.json')
            require(record['status']=='build_completed_only',key+' build failed')
            for source,wanted in record['sourceSHA256'].items():require(digest(directory/source)==wanted,key+' source drift '+source)
            for name,wanted in record['artifacts'].items():require(digest(directory/'engine'/name)==wanted,key+' artifact drift '+name)
            audit=read(directory/'logs/04.log')
            require(audit['sha256']==record['artifacts']['remux.wasm'],key+' audited binary mismatch')
            require(audit['backend']==backend and audit['privateMemory'] is True,key+' audit mismatch')
            require(audit['asyncifyControls']==(backend=='asyncify'),key+' control mismatch')
            config=(pathlib.Path(record.get('libraryBuild',str(directory)))/'objects/config_components.h').read_text()
            decoders=re.findall(r'#define CONFIG_(\w+)_DECODER 1',config)
            encoders=re.findall(r'#define CONFIG_(\w+)_ENCODER 1',config)
            allowed={'AC3','EAC3','DCA','TRUEHD','MLP','AAC','MP3','MP3FLOAT','OPUS','VORBIS','FLAC','ALAC','PCM_S16LE','PCM_S24LE','PCM_S32LE','PCM_F32LE','PCM_F64LE'}
            require(set(decoders)<=allowed and set(encoders)<={'FLAC','OPUS'},'Unexpected codec build')
            if profile=='remux':require(not decoders and not encoders,'Remux includes codecs')
            library_record=read(pathlib.Path(record['libraryBuild'])/'build-result.json') if 'libraryBuild' in record else record
            summary['builds'][key]={'originalRelinkProvenance':bool(library_record.get('relinkInputsSHA256')),'path':str(directory),'artifacts':record['artifacts'],'decoders':decoders,'encoders':encoders,'auditSHA256':digest(directory/'logs/04.log')}
    require(len(media_runs)==len(CONTRACTS),'Four campaign slices required')
    candidates=0;media_checks=0
    for name,(profile,runtimes,fixture) in zip(media_runs,CONTRACTS):
        p=RESULTS/name/'result.json';r=read(p)
        count=validate_campaign(r,profile,runtimes,fixture);media_checks+=count
        for source,wanted in r.get('sourceSHA256',{}).items():require(digest(p.parent/'sources'/source)==wanted,name+' snapshot mismatch')
        if r.get('schemaVersion')==2:
            frozen=ROOT/'build/jspi-asyncify/frozen'
            expected_frozen={'video-codec-config.js','fixtures/avc-aac.ts','fixtures/h264-pcm.mkv','fixtures/'+fixture}
            require(set(r['frozenSHA256'])==expected_frozen,'Missing frozen input hashes')
            for source,wanted in r['frozenSHA256'].items():require(digest(frozen/source)==wanted,'Frozen input drift: '+source)
        for key,engine in r['engines'].items():
            require(digest(pathlib.Path(engine['dir'])/'remux.wasm')==engine['wasmSHA256'],name+' binary drift')
            require(digest(pathlib.Path(engine['dir'])/'remux.mjs')==engine['glueSHA256'],name+' glue drift')
            if not key.endswith('-pthread'):
                require(summary['builds'][key]['artifacts']['remux.wasm']==engine['wasmSHA256'],name+' build mismatch')
                require(summary['builds'][key]['artifacts']['remux.mjs']==engine['glueSHA256'],name+' build glue mismatch')
        for c in r['cases']:
            require(c['passed'],c['id']+' failed')
            require(digest(ROOT/'build/jspi-asyncify/frozen/fixtures'/c.get('fixture','avc-aac.ts'))==c['sourceSHA256'],c['id']+' fixture drift')
            e=c['evidence'];facts=e['runtimeFacts']
            if c['runtime']!='pthread':
                candidates+=1
                require(facts['crossOriginIsolated'] is False and facts['sharedArrayBufferAvailable'] is False and facts['memoryType']=='ArrayBuffer','Wrong private environment')
                if c['runtime']=='asyncify':require(not facts['jspiSuspending'] and not facts['jspiPromising'],'JSPI present in Asyncify case')
                require(all(e['source'][x]==0 for x in ['pending','handles','timers']),'Source cleanup missing')
                require(e['state']==('failed' if c['scenario']=='fatal-output' else 'closed'),'Wrong disposal state')
                if c['scenario']=='media':require(c.get('pthreadIdentity') is True,'Missing pthread comparison')
            if c['scenario']=='media':require(digest(pathlib.Path(c['output']['path']))==c['output']['sha256'],'Output drift')
            if c['scenario']=='cancel':require(e.get('observedPending') is True,'Cancellation did not observe a pending read')
        summary['media'].append({'run':name,'passed':count,'browser':r['browser'],'coopCoepHeadersObserved':r.get('schemaVersion')==2,'sha256':digest(p)})
    summary['mediaChecks']=media_checks
    summary['candidateChecks']=candidates
    (output or OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps({'infrastructure':121,'mediaChecks':summary['mediaChecks'],'candidateChecks':candidates,'builds':4}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--media-runs',nargs=4,default=DEFAULT_RUNS);parser.add_argument('--output',type=pathlib.Path);parser.add_argument('--transcode-attempt',default='03')
    args=parser.parse_args();main(args.media_runs,args.output,args.transcode_attempt)
