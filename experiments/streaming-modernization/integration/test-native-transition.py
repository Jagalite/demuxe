#!/usr/bin/env python3
"""Sanitized packet-transition ownership test; not integrated playback evidence."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--native', required=True, type=Path)
p.add_argument('--output', required=True, type=Path)
a = p.parse_args()
native, out = a.native.resolve(), a.output.resolve()
here = Path(__file__).resolve().parent
if out.exists():
    raise SystemExit('Use a new output directory; preserve previous evidence')
out.mkdir(parents=True)
inputs = [here / 'native' / name for name in ['transition.h', 'transition.c', 'transition-test.c']]
libraries = [native / 'build' / lib / (lib + '.a') for lib in ['libavcodec', 'libavutil']]
command = ['cc', '-g', '-O1', '-fsanitize=address,undefined', '-fno-omit-frame-pointer',
           '-I' + str(native / 'source'), '-I' + str(native / 'build'),
           str(inputs[1]), str(inputs[2]), *map(str, libraries), '-lm', '-lpthread',
           '-o', str(out / 'transition-test')]
record = {'scope': __doc__, 'releaseQualified': False, 'command': command,
          'inputs': {str(f): hashlib.sha256(f.read_bytes()).hexdigest() for f in [Path(__file__), *inputs, *libraries]},
          'nativeBuild': json.loads((native / 'build-record.json').read_text())}
try:
    with (out / 'compile.log').open('w') as log:
        subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True)
    with (out / 'test.log').open('w') as log:
        result = subprocess.run([str(out / 'transition-test')], stdout=log, stderr=subprocess.STDOUT, timeout=30)
    record['exit'] = result.returncode
    record['passed'] = result.returncode == 0
    record['binarySHA256'] = hashlib.sha256((out / 'transition-test').read_bytes()).hexdigest()
finally:
    record['logs'] = {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in out.glob('*.log')}
    (out / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
raise SystemExit(0 if record.get('passed') else 1)
