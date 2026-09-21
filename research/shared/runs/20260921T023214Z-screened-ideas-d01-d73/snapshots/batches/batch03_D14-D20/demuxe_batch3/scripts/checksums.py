"""Checksums for delivered current files, excluding prior reruns and caches."""
from pathlib import Path
import hashlib
R=Path(__file__).resolve().parents[1]
files=[p for p in sorted(R.rglob('*')) if p.is_file() and p.name!='checksums.sha256' and 'runs' not in p.relative_to(R).parts and '__pycache__' not in p.parts]
(R/'checksums.sha256').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(R)}\n' for p in files))
