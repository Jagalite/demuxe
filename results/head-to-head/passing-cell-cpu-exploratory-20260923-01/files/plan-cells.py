#!/usr/bin/env python3
"""Build a CPU-only plan from passing README cells that have no CPU value."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
OUT = ROOT / 'results/head-to-head/passing-cell-cpu-exploratory-20260923-01'
README = ROOT / 'README.md'
CATALOGUE = ROOT / 'build/head-to-head/assets-passing-cpu-exploratory-20260923-01/fixtures/catalogue.json'

columns = {
    'Native video': ('video', 'default'),
    'Demuxe (auto)': ('demuxe', 'auto'),
    'Demuxe (forced software decode)': ('demuxe', 'software'),
    'Movi 0.4.0 (default)': ('movi', 'default'),
    'AVPlayer 1.3.1 (default)': ('libmedia', 'default'),
}
catalogue = json.loads(CATALOGUE.read_text())
labels = {}
for key, fixture in catalogue.items():
    labels.setdefault(fixture['label'], []).append(key)

lines = README.read_text().splitlines()
inside = False
plan = []
unmapped = []
for line_number, line in enumerate(lines, 1):
    if line.startswith('| Media format |'):
        inside = True
        continue
    if inside and line.startswith('| ---'):
        continue
    if inside and not line.startswith('|'):
        break
    if not inside or not line.startswith('|'):
        continue
    cells = [cell.strip() for cell in line.strip('|').split('|')]
    if len(cells) != 6:
        continue
    row, *values = cells
    for column, value in zip(columns, values):
        if '🟢' not in value or 'Pass' not in value or re.search(r'\d+(?:\.\d+)?%\s*CPU', value):
            continue
        matches = labels.get(row, [])
        if len(matches) != 1:
            unmapped.append({'line': line_number, 'row': row, 'column': column,
                             'fixtureMatches': matches})
            continue
        player, lane = columns[column]
        fixture = matches[0]
        plan.append({
            'id': f'{player}.{lane}.{fixture}', 'fixture': fixture,
            'player': player, 'lane': lane, 'readmeRow': row,
            'readmeColumn': column, 'priorCell': value,
            'fidelityLimited': bool(re.search(r'\\\*', value)),
        })

if unmapped:
    (OUT / 'unmapped-cells.json').write_text(json.dumps(unmapped, indent=2) + '\n')
    print(json.dumps({'unmapped': unmapped}, indent=2))
    raise SystemExit(1)

(OUT / 'cells.json').write_text(json.dumps(plan, indent=2) + '\n')
counts = {column: sum(cell['readmeColumn'] == column for cell in plan) for column in columns}
print(json.dumps({'cells': len(plan), 'byColumn': counts,
                  'fidelityLimited': sum(cell['fidelityLimited'] for cell in plan)}, indent=2))
