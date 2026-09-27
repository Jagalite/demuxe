# SPDX-License-Identifier: MIT
"""Mandatory identities shared by the two component evidence verifiers."""
import pathlib,re
from provenance import digest,verify_dependencies
COMMON_SOURCES=('runtime/scheduler.mjs','runtime/continuations.mjs','stage2/runtime/range-source.mjs','mpv/runtime/engine.mjs')
ENGINES=('service.mjs','service.wasm','service.asyncify.wasm')
def inputs_for(profile):
    sources=COMMON_SOURCES+(('mpv/tests/run-audio.mjs','mpv/tests/audio-worker.mjs','mpv/runtime/audio-worklet.mjs') if profile=='audio' else ('mpv/tests/run-subtitles.mjs','mpv/tests/subtitle-worker.mjs'))
    fixtures=('pcm.wav','pcm.s16','replacement.wav','replacement.s16') if profile=='audio' else ('m0.mkv','replacement.mkv','movtext.mp4','pgs.mkv','vobsub.mkv','font.ttf')
    return {'/experiment/'+s for s in sources}|{'/candidate/'+n for n in ENGINES}|{'/fixtures/'+n for n in fixtures}|(set() if profile=='audio' else {'/baseline/service.mjs','/baseline/service.wasm'})
def verify_inputs(folder,records,profile):
    if set(records)!=inputs_for(profile):raise ValueError('Missing or extra required evidence input')
    for url,record in records.items():
        if not re.fullmatch('[0-9a-f]{64}',record['sha256']):raise ValueError('Invalid input hash')
        if digest(pathlib.Path(record['path']))!=record['sha256']:raise ValueError('Live input drift: '+url)
        if url.startswith('/experiment/') and digest(folder/'sources'/url.removeprefix('/experiment/'))!=record['sha256']:raise ValueError('Source snapshot drift: '+url)
def verify_build(record,profile):
    if record.get('status')!='built_service_only' or record.get('profile')!=profile:raise ValueError('Wrong service build profile')
    deps=pathlib.Path(record['dependencyBuild']);identity=record.get('dependencyRecordSHA256')
    if not identity:raise ValueError('Legacy service build lacks dependency binding; rebuild required')
    if digest(deps/'build-result.json')!=identity:raise ValueError('Dependency record drift')
    import json
    build=json.loads((deps/'build-result.json').read_text());verify_dependencies(deps,pathlib.Path(build['toolchain']['sdk']))
    if not record.get('dependencyArchives') or record['dependencyArchives']!=build['archives']:raise ValueError('Dependency archive set mismatch')
    hashes=record['sourceSHA256'];roots=[pathlib.Path(n).parent for n in hashes if n.endswith('/inputs/dependency-build.json')]
    if len(roots)!=1:raise ValueError('Missing frozen dependency record')
    root=roots[0]
    wanted={str(p):digest(p) for p in root.rglob('*') if p.is_file()}
    if not hashes or wanted!=hashes:raise ValueError('Link source snapshot mismatch')
    if digest(root/'dependency-build.json')!=identity:raise ValueError('Frozen dependency record mismatch')
    for name in ['service.mjs','service.wasm','service.asyncify.wasm']:
        if not re.fullmatch('[0-9a-f]{64}',record['artifacts'].get(name,'')):raise ValueError('Missing service artifact')
def validate_frame(frame):
    if not isinstance(frame,dict) or set(frame)!={'time','x','y','width','height','bytes','sha256'}:raise ValueError('Incomplete pixel evidence')
    if not re.fullmatch('[0-9a-f]{64}',frame['sha256']):raise ValueError('Invalid pixel hash')
    if not all(type(frame[k]) is int for k in ['x','y','width','height','bytes']):raise ValueError('Invalid pixel geometry')
    if frame['width']<=0 or frame['height']<=0 or frame['x']<0 or frame['y']<0 or frame['x']+frame['width']>640 or frame['y']+frame['height']>360:raise ValueError('Invalid pixel bounds')
    if frame['bytes']!=frame['width']*frame['height']*4:raise ValueError('Invalid pixel byte count')
def verify_frames(evidence,scenario):
    frames=evidence['frames'];times={'media':[1,3,1,1],'bitmap':[1,33,35.6,33,1],'cancel':[1]}[scenario]
    if len(frames)!=len(times) or [f.get('time') for f in frames]!=times:raise ValueError('Missing or reordered frame evidence')
    for i,f in enumerate(frames):
        if scenario=='bitmap' and i==2:
            if f!={'time':35.6,'empty':True}:raise ValueError('Missing bitmap clear')
        else:validate_frame(f)
    if scenario=='media' and (frames[0]['sha256']==frames[1]['sha256'] or frames[0]!=frames[2]):raise ValueError('Cue change/replay mismatch')
    if scenario=='bitmap' and len({frames[i]['sha256'] for i in [0,1,3]})!=1:raise ValueError('Bitmap replay mismatch')
