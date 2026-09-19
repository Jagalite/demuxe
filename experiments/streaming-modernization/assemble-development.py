#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Reuse exact experimental engine bytes for explicitly listed JS/TS changes.
This is not clean-build or release evidence. Native changes are rejected.
"""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--built',type=Path,required=True);p.add_argument('--snapshot',type=Path,required=True);p.add_argument('--file',action='append',required=True);a=p.parse_args()
built=a.built.resolve();work=a.snapshot.resolve();sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def preferred(root):
 data=json.loads((root/'build/modernization-inputs.json').read_text());result={}
 for field in ['sourceSHA256','overrides','transportOverrides','switchingOverrides','concurrentOverrides','integrationOverrides','qualityOverrides','liveOverrides','dashOverrides','discontinuityOverrides','subtitleOverrides','timelineOverrides']:result.update(data.get(field,{}))
 for name in data['removed']:result.pop(name,None)
 return result
old,new=preferred(built),preferred(work);changed={k for k in set(old)|set(new) if old.get(k)!=new.get(k)}
assert changed==set(a.file),('Unexpected changes',changed)
assert all((k.startswith('web/') and k.endswith('.js') and '/engine' not in k) or (k.startswith('src/') and k.endswith('.ts')) for k in changed)
assert not (work/'build/development-build.json').exists() and not (work/'build/development-assembly.json').exists()
for name,digest in old.items():
 # tsc regenerates checked-in declarations/JS. They are rebuilt below and are
 # never copied from the provider; native input changes remain forbidden.
 if not name.startswith('web/generated/'):assert sha(built/name)==digest,name
for name,digest in new.items():assert sha(work/name)==digest,name
provider=built/'build/development-build.json';record=json.loads(provider.read_text());assert record['passed'] and not record['releaseQualified']
artifacts={}
for name,digest in record['artifacts'].items():
 source=built/name;assert sha(source)==digest
 dest=work/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,dest);artifacts[name]=digest
(work/'node_modules').symlink_to((built/'node_modules').resolve(),target_is_directory=True)
with (work/'build/development-typescript.log').open('w')as log:subprocess.run(['npm','run','build'],cwd=work,stdout=log,stderr=subprocess.STDOUT,check=True)
result={'scope':__doc__,'passed':True,'releaseQualified':False,'freshNativeBuild':False,'provider':str(built),'providerRecordSHA256':sha(provider),'assemblerSHA256':sha(Path(__file__)),'changes':{k:{'before':old.get(k),'after':new[k]}for k in sorted(changed)},'artifacts':artifacts}
(work/'build/development-assembly.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
