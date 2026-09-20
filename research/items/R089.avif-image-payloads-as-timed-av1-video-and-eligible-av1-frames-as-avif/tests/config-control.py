# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,sys,hashlib
r=Path(sys.argv[1]);j=json.loads((r/'prepare-results.json').read_text());seq=bytes.fromhex(j['matching_sequence_header']);changed=bytearray(seq);changed[0]^=32
# Exact sequence-header compatibility guard runs before any timed authoring.
def admit(configs):
 if not configs or any(c!=configs[0] for c in configs):raise ValueError('incompatible sequence configuration')
admit([seq]*3);rejected=False
try:admit([seq,bytes(changed),seq])
except ValueError:rejected=True
assert rejected;(r/'config-control.json').write_text(json.dumps({'actual_sequence_header':seq.hex(),'changed_profile_header':changed.hex(),'rejected_before_authoring':rejected,'scope':'Actual extracted configuration guard mutation; not a claim the mutated coded image is independently valid.'},indent=2))
