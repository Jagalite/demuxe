# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
exec((Path(__file__).parent/'build.py').read_text().split("snap=OUT/'snapshots'")[0])
cmd=next(x['argv'] for x in reversed(commands) if any(a.endswith('/dynamic/host.mjs') for a in x['argv']))
cmd=[a for a in cmd if not a.endswith('/dynamic/codec.wasm')];cmd=[a.replace('MAIN_MODULE=2','MAIN_MODULE=1') for a in cmd];cmd[-1]=str(OUT/'dynamic/host-lazy1.mjs');run(cmd)
