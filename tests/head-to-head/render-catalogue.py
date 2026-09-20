#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Refresh documented catalogue outcomes from a complete, verified correctness run."""
import argparse
from collections import Counter
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]

LEGEND = "**Legend:** 🟢 Native-path pass · 🔵 Other-path pass · 🟣 Default failed; tested alternative passed · 🔴 Fail · 🟡 Screen only (fidelity unqualified) · ⚪ Blocked (not tested)"

def color_status_cells(text):
    lines = []
    for line in text.splitlines():
        if line.startswith('**Legend:**'):
            line = LEGEND
        if line.startswith('| '):
            cells = line.split('|')
            for i, cell in enumerate(cells):
                route, separator, status = cell.partition(' · ')
                if separator and status.strip() in ('pass', '🟢 Pass', '🔵 Pass'):
                    marker = '🟢' if route.strip().startswith('Native') else '🔵'
                    cells[i] = route + ' · ' + marker + ' Pass '
                elif separator and status.strip().startswith('fail; '):
                    cells[i] = route + ' · 🟣 Fail; ' + status.strip()[6:] + ' '
            line = '|'.join(cells)
            line = line.replace(' · fail', ' · 🔴 Fail').replace(' · screen only', ' · 🟡 Screen only')
            line = line.replace('| Blocked', '| ⚪ Blocked')
        lines.append(line)
    return '\n'.join(lines) + '\n'

def render(run, supplements=()):
    run = run.resolve()
    subprocess.run(['node', str(ROOT / 'tests/head-to-head/verify.mjs'), str(run)], check=True)
    summary = json.loads((run / 'summary.json').read_text())
    matrix = json.loads((run / 'files/harness/matrix.json').read_text())
    fixtures = matrix['fixtures']
    assert summary['kind'] == 'correctness' and len(fixtures) == 56 and len(summary['cases']) == 224
    assert {c['id'] for c in summary['cases']} == {c['id'] for c in matrix['cases']}
    assert all(c['status'] in ('passed','failed','blocked') for c in summary['cases'])
    sources = {c['id']:run for c in summary['cases']}
    lookup = {(c['fixture'],c['player']):c for c in summary['cases']}
    fixture_origins = {key:run for key in fixtures}
    for extra in supplements:
        extra=extra.resolve()
        subprocess.run(['node', str(ROOT / 'tests/head-to-head/verify.mjs'), str(extra)], check=True)
        update=json.loads((extra/'summary.json').read_text())
        extra_matrix=json.loads((extra/'files/harness/matrix.json').read_text())
        assert update['kind']=='correctness' and update['browserIdentity']==summary['browserIdentity']
        for c in update['cases']:
            assert c['id'] in sources
            lookup[c['fixture'],c['player']]=c
            sources[c['id']]=extra
            fixtures[c['fixture']]=extra_matrix['fixtures'][c['fixture']]
            fixture_origins[c['fixture']]=extra
    cases=list(lookup.values())
    counts=Counter(c['status'] for c in cases)
    runs=[run,*[p.resolve() for p in supplements]]

    def cell(c):
        if c['status'] == 'blocked' and not c.get('screenPassed'):
            if fixtures[c['fixture']].get('blockedReason'): return 'Blocked (fixture)'
            if 'engine assets are absent' in c.get('reason',''): return 'Blocked (engine)'
            return 'Blocked (check)'
        state = c.get('initial') or c.get('failureState') or {}
        route = {'native-direct':'Native','native-remux':'Native remux','hybrid':'Hybrid','software':'Software','mse':'MSE','custom':'Custom'}.get(state.get('route'), state.get('route') or 'Unknown')
        status = 'screen only' if c['status']=='blocked' and c.get('screenPassed') else 'pass' if c['status']=='passed' else 'fail'
        return route + ' · ' + status
    replacements = {}
    for key, f in fixtures.items():
        replacements[f['label']] = '| ' + ' | '.join([f['label'],cell(lookup[key,'video']),cell(lookup[key,'demuxe']),cell(lookup[key,'movi']),cell(lookup[key,'libmedia']),'—']) + ' |'
    def replace_rows(text):
        return '\n'.join(replacements.get(line.split('|')[1].strip(),line) if line.startswith('| ') else line for line in text.splitlines())+'\n'
    readme = ROOT / 'README.md'
    s = replace_rows(readme.read_text())
    a = s.index('\n\n', s.index('## Head-to-head media coverage')) + 2
    b = s.index('| Media format |', a)
    intro = f'''The original four combinations and all 56 additional combinations now have recorded
outcomes. Expanded run: **{summary['startedAt'][:10]}, Chrome 152, headless**.
**Screen only** means playback checks passed but surround/HDR fidelity remains
unqualified. **Blocked** identifies unavailable fixtures, engines, or checks.
These are bounded synthetic tests, not universal support guarantees. **% gains remain
unmeasured.** See [evidence and limitations](docs/HEAD-TO-HEAD-CATALOGUE.md).

{LEGEND}

'''
    readme.write_text(color_status_cells(s[:a]+intro+s[b:]))
    routes = ROOT / 'docs/HEAD-TO-HEAD-ROUTES.md'
    s = replace_rows(routes.read_text())
    a = s.index('## Planned coverage — not yet tested') if '## Planned coverage — not yet tested' in s else s.index('## Expanded catalogue results')
    b = s.index('### First expansion:', a)
    intro = f'''## Expanded catalogue results

The 56 additional combinations were processed in `{run.name}` on {summary['startedAt'][:10]}, with the explicitly linked follow-up runs:
{counts['passed']} passed, {counts['failed']} failed, {counts['blocked']} blocked across four default players.
{sum(bool(f.get('blockedReason')) for f in fixtures.values())} combinations could not produce the required fixture; their rows are blocked,
not playback failures. **Screen only** means the bounded playback check succeeded
but discrete surround or reference HDR fidelity remains unqualified. **—** means
no CPU gain measurement. These outcomes are separate from the original `matrix-01`
results above. See [full evidence, blocker reasons and caveats](HEAD-TO-HEAD-CATALOGUE.md).

'''
    s=s[:a]+intro+s[b:]
    s=s.replace('### Before a planned row becomes a result','### Before adding or qualifying another row')
    s=s.replace('These four\nfixtures do not cover', 'The original four\nfixtures do not cover')
    s=s.replace('This is a static view of `matrix-01`. A future run has separate route evidence;', 'The original tables are a static view of `matrix-01`; the expanded tables identify their separate run. A future run has separate route evidence;')
    s=s.replace('snapshot. No player tests were rerun to create this document.', 'snapshot. The expanded catalogue was executed separately; original results were preserved.')
    if '**Legend:**' not in s:
        s = s.replace("## Default configurations\n", "## Default configurations\n\n" + LEGEND + "\n")
    routes.write_text(color_status_cells(s))
    rel='../'+str(run.relative_to(ROOT))
    lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Expanded player comparison results','',
        f'Primary run: `{run.name}`. Browser: `{summary["browserIdentity"]}`. Demuxe source: `{summary["playerSourceRevision"]}` plus the captured dirty player diff.',
        '',f'[Raw report]({rel}/REPORT.md) · [Summary]({rel}/summary.json) · [Prepared catalogue]({rel}/files/preparation/fixtures/catalogue.json) · [Integrity hashes]({rel}/manifest.json)',
        '', f'All 56 planned combinations were processed against four default players. {sum(not f.get("blockedReason") for f in fixtures.values())} generated fixtures were available; {sum(bool(f.get("blockedReason")) for f in fixtures.values())} combinations were blocked at fixture preparation. No performance measurements were taken.',
        '', '| Player | Passed | Failed | Blocked |','| --- | ---: | ---: | ---: |']
    for player in ['video','demuxe','movi','libmedia']:
        counts=Counter(c['status'] for c in cases if c['player']==player)
        lines.append(f'| {player} | {counts["passed"]} | {counts["failed"]} | {counts["blocked"]} |')
    lines += ['', 'Latest outcome per player/combination is shown. Supplemental runs replace only their exact rows; the original blocked records remain in the primary run.', '']
    for extra in runs[1:]:
        extra_summary=json.loads((extra/'summary.json').read_text())
        extra_rel='../'+str(extra.relative_to(ROOT))
        lines.append(f'- [Supplement {extra.name}]({extra_rel}/REPORT.md): {len(extra_summary["cases"])} cases, source `{extra_summary["playerSourceRevision"]}`; exact asset/harness identities are retained separately.')
    lines += ['', '## Reading the results', '',
        '- Pass means the declared bounded synthetic output/lifecycle checks passed on this browser and snapshot. It is not general format support.',
        '- Screen only remains blocked for full qualification: stereo downmix or tagged HDR decode may work, but discrete surround and reference HDR fidelity were not established.',
        '- Earlier missing-engine blockers remain in their original records. Latest rows reflect the engine availability in their linked run; no older engine binaries were substituted.',
        '- Text subtitles are checked with macOS Vision OCR for the exact marked phrase; ASS/PGS/VobSub require the visible magenta drawing. PGS/VobSub also pass independent host decode/overlay checks. These checks do not cover every style.',
        '- Live HLS checks a short sliding-window progression, not indefinite live operation or recovery. VOD streams also undergo seeks and EOF checks.',
        '- Failed cases stay failed. Timeouts, marker mismatches, and API errors are observations, not established root causes.',
        '- Original four-combination results remain from matrix-01. Expanded results use the new frozen snapshot and harness; pilots are separate.',
        '', '## Fixture blockers', '']
    for f in fixtures.values():
        if f.get('blockedReason'):lines.append(f'- **{f["label"]}:** {f["blockedReason"]}')
    lines += ['', '## Outcome details', '', '| Combination | Player | Result | Reason / scope | Evidence |','| --- | --- | --- | --- | --- |']
    for c in cases:
        rel='../'+str(sources[c['id']].relative_to(ROOT))
        reason=(c.get('reason') or c.get('qualificationLimit') or 'Declared checks passed').split('\n')[0].replace('|','/')
        lines.append(f'| {fixtures[c["fixture"]]["label"]} | {c["player"]} | {cell(c)} | {reason} | [record]({rel}/{c["recordPath"]}) |')
    (ROOT/'docs/HEAD-TO-HEAD-CATALOGUE.md').write_text('\n'.join(lines)+'\n')

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('run',type=Path)
    parser.add_argument('--supplement',type=Path,action='append',default=[])
    args=parser.parse_args()
    render(args.run,args.supplement)
