# SPDX-License-Identifier: Apache-2.0
"""Verify distributed byte identities; does not qualify media output or performance."""
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'manifest.json').read_text());errors=[]
for row in manifest['files']:
 p=root/row['path']
 if not p.is_file():errors.append(f"missing: {row['path']}");continue
 b=p.read_bytes()
 if len(b)!=row['bytes'] or hashlib.sha256(b).hexdigest()!=row['sha256']:
  errors.append(f"mismatch: {row['path']}")
if errors:
 print('\n'.join(errors));sys.exit(1)
print(f"Verified {len(manifest['files'])} distributed files. No media/performance claim is implied.")
