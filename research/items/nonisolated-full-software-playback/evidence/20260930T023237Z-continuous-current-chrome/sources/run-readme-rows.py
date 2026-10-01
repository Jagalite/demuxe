#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Run each real Software row serially on both private backends."""
import argparse, datetime, json, subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('build',type=Path);p.add_argument('references',type=Path);p.add_argument('evidence',type=Path)
a=p.parse_args();a.evidence.mkdir(exist_ok=False,parents=True)
root=Path(__file__).resolve().parents[4]
references=json.loads((a.references/'references.json').read_text())
results={'scope':'Private Software host and real finite README row fixtures; public player integration and performance untested','references':references,'rows':[]}
(a.evidence/'sources').mkdir()
(a.evidence/'sources/run-readme-rows.py').write_bytes(Path(__file__).read_bytes())
for row in references['rows']:
    profile=row['profile'];key=profile['key'];ref=a.references/key
    run_id=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+key+'-01'
    output=a.evidence.parent/run_id
    command=['node',str(Path(__file__).with_name('run-playback.mjs')),str(a.build.resolve()),str(output.resolve()),profile['fixture'],str((ref/'reference.rgb').resolve()),str((ref/'reference.f32').resolve()) if (ref/'reference.f32').exists() else '-',str((ref/'profile.json').resolve())]
    with (a.evidence/(key+'.log')).open('w') as log:
        rc=subprocess.run(command,cwd=root,stdout=log,stderr=subprocess.STDOUT).returncode
    result=json.loads((output/'result.json').read_text()) if (output/'result.json').exists() else None
    results['rows'].append({'key':key,'run_id':run_id,'command':command,'returncode':rc,'cases':[{'backend':c['backend'],'passed':c['passed'],'error':c.get('error'),'pictureFailure':c.get('pictureFailure'),'audio':c.get('audio')} for c in result['cases']] if result else []})
    (a.evidence/'result.json').write_text(json.dumps(results,indent=2)+'\n')
    print(json.dumps(results['rows'][-1]),flush=True)
    # Retain failures and continue through independently prepared rows.
    if rc: results['failed']=True
(a.evidence/'result.json').write_text(json.dumps(results,indent=2)+'\n')
if results.get('failed'):raise SystemExit(1)
