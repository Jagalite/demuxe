# SPDX-License-Identifier: Apache-2.0
"""Run the maintained clean build in an isolated checkout and retain its evidence."""
from pathlib import Path
import datetime
import hashlib
import json
import os
import shutil
import subprocess

root=Path('/Volumes/seed2/Projects/demuxe')
work=root/'build/head-to-head/engine-build-01'
evidence=root/'results/head-to-head/engine-build-01'
evidence.mkdir(exist_ok=False)
(evidence/'files').mkdir()
shutil.copyfile(__file__,evidence/'files/build-driver.py')
sdk=Path('/Volumes/seed2/Projects/demuxe-release-closeout-20260916/build/emsdk-4.0.14')
cache=sdk.parent/'downloads'
record={'started':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=work,text=True).strip(),'checkout':str(work),'sdk':str(sdk),'commands':[],'status':'running'}
def save():
    (evidence/'build.json').write_text(json.dumps(record,indent=2)+'\n')
def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for data in iter(lambda:f.read(1048576),b''):h.update(data)
    return h.hexdigest()
def run(argv):
    item={'argv':argv,'cwd':str(work),'started':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    record['commands'].append(item);save();print('RUN',argv,flush=True)
    with (evidence/'files/build.log').open('a') as log:
        log.write('\nCOMMAND '+json.dumps(argv)+'\n');log.flush()
        result=subprocess.run(argv,cwd=work,env=env,stdout=log,stderr=subprocess.STDOUT)
    item.update(exit=result.returncode,finished=datetime.datetime.now(datetime.timezone.utc).isoformat());save()
    if result.returncode:raise RuntimeError('Build step failed: '+str(argv))
try:
    downloads=work/'build/downloads';downloads.mkdir(parents=True)
    record['cachedArchives']={}
    for item in json.loads((work/'sources.lock.json').read_text())['sources']:
        source=cache/(item['name']+'.tar.gz')
        if source.exists() and sha(source)==item['sha256']:
            shutil.copyfile(source,downloads/source.name);record['cachedArchives'][source.name]=item['sha256']
    # Only this runtime worker differs from HEAD among production/build input paths.
    shutil.copyfile(root/'web/native-remux-worker.js',work/'web/native-remux-worker.js')
    record['runtimeWorkerSHA256']=sha(work/'web/native-remux-worker.js')
    (evidence/'files/runtime-worker.patch').write_text(subprocess.check_output(['git','diff','--','web/native-remux-worker.js'],cwd=work,text=True))
    env=os.environ.copy();env.update(DEMUXE_SDK=str(sdk),DEMUXE_JOBS='4')
    save()
    run(['python3','-m','venv','build/venv'])
    run(['build/venv/bin/python','-m','pip','install','meson==1.7.2','Jinja2==3.1.6','MarkupSafe==3.0.2'])
    run(['npm','ci','--no-audit','--no-fund'])
    run(['bash','scripts/build-beta-engines.sh','--clean'])
    for name in ['beta-build-start.json','beta-build.json','beta-toolchain.json']:
        shutil.copyfile(work/'build'/name,evidence/name)
    for name in ['engine-hybrid','engine-software-full']:
        target=root/'web'/name
        if target.exists():raise RuntimeError('Engine directory appeared during build; refusing to overwrite: '+str(target))
        source=work/'web'/name
        assert (source/'player.mjs').is_file() and (source/'player.wasm').is_file()
        shutil.copytree(source,target)
        record.setdefault('installed',{})[name]={p.name:{'sha256':sha(p),'bytes':p.stat().st_size} for p in target.iterdir() if p.is_file()}
        save()
    record.update(status='built-and-installed',finished=datetime.datetime.now(datetime.timezone.utc).isoformat());save()
except Exception as error:
    record.update(status='failed',error=str(error));save();raise
finally:
    captured={str(p.relative_to(evidence)):sha(p) for p in sorted(evidence.rglob('*')) if p.is_file() and p.name!='manifest.json'}
    (evidence/'manifest.json').write_text(json.dumps({'sha256':captured},indent=2)+'\n')
print(json.dumps(record.get('installed',{}),indent=2),flush=True)
