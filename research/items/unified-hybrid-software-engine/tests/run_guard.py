# SPDX-License-Identifier: Apache-2.0
"""Keep executable tooling from changing captured evidence."""
import os
from pathlib import Path


def resolve_run(base):
    return Path(os.environ.get('UNIFIED_RUN') or (Path(base) / 'active-run.txt').read_text().strip())


def require_writable_run(run):
    run = Path(run).resolve()
    evidence = Path(__file__).resolve().parent.parent / 'evidence'
    if run.parent != evidence or not run.is_dir():
        raise ValueError('UNIFIED_RUN must name an existing direct child of this item\'s evidence directory')
    if (run / 'manifest.json').exists():
        raise ValueError(f'Sealed evidence is read-only: {run}. Create a new run and set UNIFIED_RUN.')
    return run
