#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Run bounded exact-package optional-runtime qualification without release promotion."""
import argparse, hashlib, json, os, pathlib, subprocess, tarfile, time

root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--archive',type=pathlib.Path,required=True)
p.add_argument('--ass-build',type=pathlib.Path,required=True)
p.add_argument('--adaptation-build',type=pathlib.Path,required=True)
p.add_argument('--output',type=pathlib.Path,required=True)
a=p.parse_args();out=a.output.resolve();archive=a.archive.resolve()
if out.exists():raise SystemExit('Use a fresh qualification output')
out.mkdir(parents=True)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
record={'archive':str(archive),'archiveSHA256':digest(archive),'passed':False,'releasePromoted':False,
        'scope':'Optional file playback subset; Chrome FLAC unequal tails, Firefox rejection and qualified mpv recovery; no streaming adaptation, endurance or physical A/V claim',
        'checks':[]}
def save():(out/'qualification.json').write_text(json.dumps(record,indent=2)+'\n')
save()
with tarfile.open(archive) as tar:
    manifest=json.load(tar.extractfile('package/release-manifest.json'))
    for name,expected in manifest['files'].items():
        if hashlib.sha256(tar.extractfile('package/'+name).read()).hexdigest()!=expected['sha256']:
            raise SystemExit('Package hash mismatch: '+name)
    tar.extractall(out/'installed',filter='data')
record['runtimeFiles']={n:v for n,v in manifest['files'].items() if n.startswith('web/') and pathlib.Path(n).suffix in ['.js','.mjs','.wasm']}
for engine,folder,stem in [(a.ass_build,'engine-ass','subtitles'),(a.adaptation_build,'engine-adaptation','remux')]:
    for ext in ['mjs','wasm']:
        name=f'web/{folder}/{stem}.{ext}'
        if digest(engine/(stem+'.'+ext))!=manifest['files'][name]['sha256']:
            raise SystemExit('Source build and installed runtime differ: '+name)
env={**os.environ,'BETA_ARCHIVE':str(archive),'DEMUXE_RUNTIME_ROOT':str(out/'installed/package'),
     'ADAPTATION_FIXTURE':str(root/'build/optimization-fixtures/long-pcm.mkv'),
     'AUTOMATIC_ADAPTATION_FIXTURE':str(root/'build/optimization-fixtures/automatic-lossless.mkv')}
for name in ['BROWSER','CASES','PROFILE','REPRO_UNQUALIFIED','SEEKS_ONLY','COMBINATION','REMOTE','ENGINE_BUILD']:env.pop(name,None)
def run(name,command,extra=None):
    item={'name':name,'command':command,'harnesses':{f:digest(root/f) for f in command if (root/f).is_file()},'passed':False}
    if any(f.startswith('tests/') and f.endswith('.mjs') for f in command):item['harnesses']['scripts/serve.mjs']=digest(root/'scripts/serve.mjs')
    for relative,sha in item['harnesses'].items():
        snapshot=out/'harnesses'/relative;snapshot.parent.mkdir(parents=True,exist_ok=True)
        if snapshot.exists() and digest(snapshot)!=sha:raise SystemExit('Harness changed during qualification: '+relative)
        snapshot.write_bytes((root/relative).read_bytes())
    record['checks'].append(item);save();begun=time.monotonic()
    with (out/(name+'.log')).open('w') as log:
        process=subprocess.run(command,cwd=root,env={**env,**(extra or {})},stdout=log,stderr=subprocess.STDOUT)
    item.update(exitCode=process.returncode,seconds=time.monotonic()-begun,log=name+'.log',sha256=digest(out/(name+'.log')),passed=process.returncode==0)
    save()
    if process.returncode:raise SystemExit('Qualification failed: '+name+'; failure retained')
    print(name,'PASS',flush=True)
run('ass-source',['python3','scripts/verify-native-ass-build.py',str(a.ass_build)])
run('adaptation-source',['python3','scripts/verify-audio-adaptation-build.py',str(a.adaptation_build)])
run('assets',['node','--test','tests/copy-assets.mjs'])
for browser in ['chrome','firefox']:
    run('consumer-'+browser,['node','tests/beta-consumer.mjs'],{'BROWSER':browser,'CASES':'automatic-local,automatic-lossless,hybrid-pin,software-pin,native-remux,native-external-ass,native-adaptation,native-opus,native-adaptation-ass-gain'})
    for name,script,options in [
        ('automatic','tests/automatic-adaptation.mjs',{}),
        ('fractional-seek','tests/native-fractional-seek.mjs',{}),
        ('ass','tests/native-ass.mjs',{}),
        ('ass-selection','tests/native-ass-selection-regressions.mjs',{}),
        ('ass-style','tests/native-ass-style-regressions.mjs',{}),
        ('flac','tests/audio-adaptation.mjs',{'CASES':'original-edge,multi-audio'}),
        ('opus','tests/audio-adaptation.mjs',{'PROFILE':'opus','CASES':'original-edge,opus-multi-audio'}),
        ('lifecycle-flac','tests/audio-adaptation-lifecycle.mjs',{'CASES':'bounded-local-gain,authenticated-range,destroy-blocked-read,incorrect-range'}),
        ('lifecycle-opus','tests/audio-adaptation-lifecycle.mjs',{'PROFILE':'opus','CASES':'bounded-local-gain,authenticated-range,destroy-blocked-read,incorrect-range'}),
        ('gain','tests/in-place-gain.mjs',{}),
        ('unequal-tails','tests/unequal-tail-windows.mjs',{'SEEKS':'1','COMBINATION':'1','REMOTE':'1','ENGINE_BUILD':str(a.adaptation_build.resolve())})]:
        run(name+'-'+browser,['node',script],{'BROWSER':browser,**options})
if digest(archive)!=record['archiveSHA256']:raise SystemExit('Archive changed during qualification')
record['passed']=True
record['releaseRequirementsRemaining']=['Clean reviewed tagged source and standard release verifier; no tag or publication is performed by this tool']
save()
