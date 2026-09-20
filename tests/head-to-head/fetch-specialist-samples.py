# SPDX-License-Identifier: Apache-2.0
"""Fetch the hash-pinned technical samples locally; does not grant redistribution rights."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

out=Path(sys.argv[1])
out.mkdir(parents=True,exist_ok=False)
lock=json.loads(Path(__file__).with_name('specialist-sources.json').read_text())
for name,record in lock['sources'].items():
    target=out/name
    subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','180',record['url'],'--output',str(target)],check=True)
    assert hashlib.sha256(target.read_bytes()).hexdigest()==record['sha256'], name
    assert target.stat().st_size==record['bytes'], name
    (out/(name+'.download.json')).write_text(json.dumps(record,indent=2)+'\n')
    print(name,'verified',flush=True)
