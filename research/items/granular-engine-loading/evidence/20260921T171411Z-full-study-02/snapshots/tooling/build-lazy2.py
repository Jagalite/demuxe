# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
exec((Path(__file__).parent/'build.py').read_text().split("snap=OUT/'snapshots'")[0])
cmd=next(x['argv'] for x in reversed(commands) if any(a.endswith('/dynamic/host.mjs') for a in x['argv']));cmd=[a for a in cmd if not a.endswith('/dynamic/codec.wasm')];extra=json.loads((OUT/'dynamic/required-symbols.json').read_text())
for i,a in enumerate(cmd):
 if a.startswith('-sEXPORTED_FUNCTIONS='):cmd[i]='-sEXPORTED_FUNCTIONS='+json.dumps(sorted(set(json.loads(a.split('=',1)[1])+extra)),separators=(',',':'))
cmd[-1]=str(OUT/'dynamic/host-lazy2.mjs');run(cmd)
