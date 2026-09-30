#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Run focused production contract checks and retain exact source evidence."""
import hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
names=['tests/provider-runtime.mjs','tests/fast-source-inspector.mjs','tests/plan-admission.mjs','tests/native-readiness-contracts.mjs','tests/component-selection.mjs','tests/provider-acquisition.mjs','tests/provider-container-metadata.mjs']
result=subprocess.run(['node','--test','--test-reporter=tap',*names],cwd=ROOT,capture_output=True,text=True)
config=json.loads((ROOT/'licensing/provider-packages.json').read_text())
report={'passed':result.returncode==0,'scope':'Current core source: provider trust/acquisition, inspection, readiness, plan admission and component selection contracts','exitCode':result.returncode,'tests':names,'sourceSHA256':{name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest()for name in config['playerCoreSources']},'stdout':result.stdout,'stderr':result.stderr}
out=ROOT/'results/media-components/production-preparation/source-gates.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'passed':report['passed'],'counts':re.findall(r'^# (tests|pass|fail) (\d+)$',result.stdout,re.M)},indent=2))
raise SystemExit(result.returncode)
