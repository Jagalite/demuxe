#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Import historical research into item homes, or verify their evidence read-only."""
import argparse
import collections
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
AREA = ROOT / 'research'
CATALOGUE = Path('results/full-catalogue-v4/Demuxe_All_Items_Screening_v4')
STAGES = ('define', 'prepare', 'screen', 'correctness', 'performance', 'results', 'decision')
STATUSES = {'passed', 'failed', 'blocked', 'pending', 'not_applicable'}
CAMPAIGNS = {
    'local-screening': Path('results/local-screening/inventory.jsonl'),
    'full-catalogue-v4': CATALOGUE / 'state/decisions.jsonl',
    'full-completion': Path('results/full-completion/completion.jsonl'),
    'top100': Path('results/top100/decisions.jsonl'),
}


def read(path):
    return json.loads(path.read_text())


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def repo_path(base, name):
    path = (ROOT / base / name).resolve()
    return path.relative_to(ROOT).as_posix()


def link(folder, path):
    return os.path.relpath(ROOT / path, folder)


def local_key(record, items):
    # Two legacy numbers have multiple definitions; preserve the exact queue meaning.
    special = {
        'decoder-session-continuity': 'R242.keep-decoder-sessions-continuous-across-transport-and-mux-boundaries.report-a',
        'truthful-fmp4-seek-index': 'R131.global-mp4-sidx-materially-changes-remote-access.report-frontier',
    }
    if record['stable_key'] in special:
        return special[record['stable_key']]
    number = int(record['legacy_ids'][0][1:])
    matches = [i['key'] for i in items if i['legacy_number'] == number]
    if len(matches) != 1:
        raise ValueError(f'Ambiguous local identity: {record["stable_key"]}')
    return matches[0]


def import_history():
    if (AREA / 'index.json').exists() or (AREA / 'items').exists():
        raise ValueError('Item homes already exist. Import is one-shot; edit items and append runs, never overwrite them.')
    definitions = read(ROOT / CATALOGUE / 'catalogue/research_items.json')['items']
    keys = {i['key'] for i in definitions}
    histories = collections.defaultdict(list)
    campaign_keys = {}
    source_files = {str(CATALOGUE / 'catalogue/research_items.json')}
    for campaign, ledger in CAMPAIGNS.items():
        source_files.add(str(ledger))
        seen = []
        for line, raw in enumerate((ROOT / ledger).read_text().splitlines(), 1):
            record = json.loads(raw)
            key = local_key(record, definitions) if campaign == 'local-screening' else record['key']
            if key not in keys:
                raise ValueError(f'Unknown full key: {key}')
            base = CATALOGUE if campaign == 'full-catalogue-v4' else ledger.parent
            refs = record.get('evidence', [])
            if isinstance(refs, str):
                refs = [refs]
            evidence = []
            for ref in refs:
                ref = {'path': ref} if isinstance(ref, str) else ref
                evidence.append({'path': repo_path(base, ref['path']),
                                 'declared_sha256': ref.get('sha256')})
            histories[key].append({'campaign': campaign, 'ledger': str(ledger), 'line': line,
                                   'record': record, 'evidence': evidence})
            if key not in seen:
                seen.append(key)
        campaign_keys[campaign] = seen
    # Hash every source before generating views; never edit or restamp a captured artifact.
    source_hashes = {name: digest(ROOT / name) for name in source_files}
    assets = {}
    warnings = []
    index = []
    item_imports = {}
    for definition in definitions:
        key = definition['key']
        folder = AREA / 'items' / key
        history = histories[key]
        latest = history[-1]  # Explicit campaign order, then append order; not an inferred score.
        current = latest['record']
        state = current.get('state', current.get('decision', current.get('disposition')))
        refs = {}
        for event in history:
            for ref in event['evidence']:
                refs.setdefault(ref['path'], []).append({
                    'campaign': event['campaign'], 'line': event['line'],
                    'declared_sha256': ref['declared_sha256']})
        card = str(CATALOGUE / 'catalogue/cards' / (key + '.md'))
        refs.setdefault(card, [])
        source = definition.get('definition_source')
        if source:
            refs.setdefault(repo_path(CATALOGUE, source['path']), []).append({
                'campaign': 'definition', 'declared_sha256': source.get('sha256')})
        # The original local ledger has prose findings rather than evidence arrays.
        # Preserve its full queue and qualification entry points without guessing run mappings.
        if any(e['campaign'] == 'local-screening' for e in history):
            for name in ['README.md', 'follow-up.md', 'full-queue-audit.md']:
                refs.setdefault('results/local-screening/' + name, [])
            if key.startswith('R047.'):
                refs.setdefault('results/local-screening/r47-qualification.md', [])
        item_assets = []
        for name, uses in sorted(refs.items()):
            if name not in assets:
                path = ROOT / name
                if not path.is_file():
                    raise ValueError(f'Missing evidence: {name}')
                assets[name] = {'sha256': digest(path), 'bytes': path.stat().st_size}
            asset = {'path': name, **assets[name], 'uses': uses}
            item_assets.append(asset)
            for use in uses:
                expected = use['declared_sha256']
                if expected and expected != asset['sha256']:
                    warnings.append({'key': key, 'path': name, **use,
                                     'observed_sha256': asset['sha256'],
                                     'status': 'historical_hash_mismatch'})
        missing = definition['definition_status'] == 'DEFINITION_NOT_RECOVERED'
        stages = {s: {'status': 'pending', 'basis': 'Historical evidence retained; stage-specific acceptance has not been reconciled into this checklist.', 'evidence': []} for s in STAGES}
        stages['define'] = {'status': 'blocked' if missing else 'passed', 'basis': 'Definition unavailable.' if missing else 'Existing source-grounded definition imported; acceptance criteria must be reviewed before a new run.', 'evidence': [card]}
        stages['screen'] = {'status': 'passed', 'basis': 'Historical bounded screening disposition recorded. This is completion of screening, not candidate correctness.', 'evidence': [latest['ledger']]}
        stages['results'] = {'status': 'passed', 'basis': 'Existing results indexed with current byte identities; historical mismatches are separately retained in the migration record.', 'evidence': [a['path'] for a in item_assets]}
        stages['decision'] = {'status': 'passed', 'basis': f'Historical decision imported verbatim: {state}. No integration or qualification inferred.', 'evidence': [latest['ledger']]}
        item = {'schema': 1, 'key': key, 'title': definition['title'] or key,
                'definition': definition, 'stages': stages,
                'current_decision': {'campaign': latest['campaign'], 'ledger': latest['ledger'],
                                     'line': latest['line'], 'record': current},
                'next_action': current.get('next_test') or current.get('reopen_condition') or definition.get('default_next_action'),
                'integration': {'status': 'not_assessed_by_migration'},
                'qualification': {'status': 'not_assessed_by_migration'}}
        write(folder / 'item.json', item)
        (folder / 'history.jsonl').write_text(''.join(json.dumps(e, ensure_ascii=False) + '\n' for e in history))
        item_imports[key] = {'history_records': len(history),
                             'history_sha256': digest(folder / 'history.jsonl'),
                             'artifacts': [a['path'] for a in item_assets]}
        write(folder / 'evidence/index.json', {'schema': 1, 'key': key, 'artifacts': item_assets,
              'note': 'Historical artifacts remain at original paths. New runs belong in evidence/<unique-run-id>/.'})
        reason = current.get('reason') or current.get('finding') or 'See the original decision record.'
        stage_table = '\n'.join(f'| {s} | {v["status"]} | {v["basis"]} |' for s, v in stages.items())
        evidence_links = '\n'.join(f'- [{a["path"]}]({link(folder, a["path"])})' for a in item_assets)
        (folder / 'README.md').write_text(f'''<!-- SPDX-License-Identifier: CC-BY-4.0 -->

# {item['title']}

Full identity: `{key}`. Reused R-numbers are separate mechanisms.

Current imported decision: **{state}** ({latest['campaign']}).

{reason}

Next action: {item['next_action']}

## Definition and contract

{definition.get('source_excerpt') or 'Definition not recovered; do not invent a hypothesis.'}

Output contract: {definition.get('scope_contract', 'See definition.')}

Primary metric: {definition.get('primary_metric', 'Pending.')}

Adverse control: {definition.get('negative_control', 'Pending.')}

## Stages

| Stage | Status | Basis |
| --- | --- | --- |
{stage_table}

Pending preparation/correctness/performance means the historical evidence has not
been converted into a stage acceptance record; it does not erase historical passes
or require rerunning them. Read the evidence before updating these fields.

## Working files

- [Item state and original definition](item.json): authoritative current metadata; update this README when changing it.
- [Decision history](history.jsonl): imported records and their exact ledger locations; append future decisions.
- [Evidence index](evidence/index.json): paths, hashes, and historical hash declarations.
- [Research process](../../PROCESS.md): run layout, gates, fixture and license requirements.

Create `tests/` and `fixtures/` only when this item needs its own code or data.
Shared historical harnesses remain in `tests/` at repository root; commands and
fixture references are in the linked evidence. No unverified harness-to-item
association was invented during migration.

## Archived evidence and definitions

{evidence_links}
''')
        index.append({'key': key, 'title': item['title'], 'path': f'items/{key}',
                      'decision_at_import': state, 'campaign_at_import': latest['campaign']})
    write(AREA / 'index.json', {'schema': 1, 'items': index,
          'note': 'Identity/navigation index; current state lives in each item.json, not this import snapshot.'})
    for campaign, members in campaign_keys.items():
        write(AREA / 'campaigns' / (campaign + '.json'), {'schema': 1, 'campaign': campaign,
              'archive_ledger': str(CAMPAIGNS[campaign]), 'items': members})
        lines = '\n'.join(f'- [{key}](../items/{key}/README.md)' for key in members)
        (AREA / 'campaigns' / (campaign + '.md')).write_text(
            f'<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n# {campaign}\n\n'
            f'Historical membership: {len(members)} items. Current decisions belong to each item.\n\n'
            f'[Original ledger](../../{CAMPAIGNS[campaign]})\n\n{lines}\n')
    write(AREA / 'migration.json', {'schema': 1,
          'base_git': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
          'items': len(index), 'history_records': sum(map(len, histories.values())),
          'source_sha256': source_hashes, 'archived_artifacts': assets,
          'item_imports': item_imports,
          'historical_hash_mismatches': warnings,
          'excluded_active_campaign': 'results/catalogue-current (no stable decision ledger at import)',
          'strategy': 'Canonical item metadata and evidence indexes; historical bytes and executable paths retained.'})
    print(f'Imported {len(index)} item homes; {len(assets)} distinct artifacts; {len(warnings)} preserved historical hash mismatches.')


def verify():
    migration = read(AREA / 'migration.json')
    index = read(AREA / 'index.json')['items']
    failures = []
    keys = [i['key'] for i in index]
    ledgers = {name: [json.loads(line) for line in (ROOT / name).read_text().splitlines()]
               for name in migration['source_sha256'] if name.endswith('.jsonl')}
    imported_keys = {i['key'] for i in read(ROOT / CATALOGUE / 'catalogue/research_items.json')['items']}
    if len(keys) != len(set(keys)) or not imported_keys <= set(keys) or len(imported_keys) != migration['items']:
        failures.append('Duplicate or missing item identities')
    # Capture integrity is distinct from whether the original experimental hypothesis passed.
    for name, sha in migration['source_sha256'].items():
        if not (ROOT / name).is_file() or digest(ROOT / name) != sha:
            failures.append('Changed imported ledger/definition: ' + name)
    for name, asset in migration['archived_artifacts'].items():
        if not (ROOT / name).is_file() or digest(ROOT / name) != asset['sha256']:
            failures.append('Changed/missing archived evidence: ' + name)
    for entry in index:
        if entry['path'] != 'items/' + entry['key'] or '/' in entry['key'] or entry['key'] in ('.', '..'):
            failures.append('Unsafe item path: ' + entry['key'])
            continue
        folder = AREA / entry['path']
        item = read(folder / 'item.json')
        evidence = read(folder / 'evidence/index.json')
        original = migration.get('item_imports', {}).get(entry['key'])
        if original:
            captured = (folder / 'history.jsonl').read_bytes().splitlines(keepends=True)
            prefix = b''.join(captured[:original['history_records']])
            if hashlib.sha256(prefix).hexdigest() != original['history_sha256']:
                failures.append('Imported history changed or removed: ' + entry['key'])
            if not set(original['artifacts']) <= {a['path'] for a in evidence['artifacts']}:
                failures.append('Imported artifact reference removed: ' + entry['key'])
        if item['key'] != entry['key'] or evidence['key'] != item['key']:
            failures.append('Wrong item identity: ' + entry['key'])
        if set(item['stages']) != set(STAGES):
            failures.append('Missing workflow stages: ' + item['key'])
        for stage, value in item['stages'].items():
            if value['status'] not in STATUSES or not value.get('basis'):
                failures.append('Invalid stage: ' + item['key'] + '/' + stage)
        if item['stages']['performance']['status'] == 'passed' and item['stages']['correctness']['status'] != 'passed':
            failures.append('Performance accepted before correctness: ' + item['key'])
        for artifact in evidence['artifacts']:
            pinned = migration['archived_artifacts'].get(artifact['path'])
            if pinned and pinned['sha256'] != artifact['sha256']:
                failures.append('Item evidence index drift: ' + artifact['path'])
            elif not pinned:
                name = repo_path(Path('.'), artifact['path'])
                if not (ROOT / name).is_file() or digest(ROOT / name) != artifact['sha256']:
                    failures.append('Changed/missing new evidence: ' + name)
        for event in map(json.loads, (folder / 'history.jsonl').read_text().splitlines()):
            if 'ledger' not in event:
                continue  # New run decisions have their own run manifests.
            source = ledgers[event['ledger']][event['line'] - 1]
            if source != event['record']:
                failures.append('Changed imported decision: ' + item['key'])
        decision = item['current_decision']
        if 'ledger' in decision:
            source = ledgers[decision['ledger']][decision['line'] - 1]
            if source != decision['record']:
                failures.append('Changed imported current decision: ' + item['key'])
    for path in (AREA / 'campaigns').glob('*.json'):
        campaign = read(path)
        # Campaigns may retain descriptive membership records alongside keys.
        members = [entry.get('key') if isinstance(entry, dict) else entry
                   for entry in campaign['items']]
        if any(not isinstance(key, str) for key in members) or not set(members) <= set(keys) or len(set(members)) != len(members):
            failures.append('Invalid campaign membership: ' + str(path))
    print(json.dumps({'items': len(keys), 'archived_artifacts': len(migration['archived_artifacts']),
          'historical_hash_mismatches_retained': len(migration['historical_hash_mismatches']),
          'failures': failures, 'passed': not failures,
          'scope': 'Research organization and captured byte identity only; no playback, build, or performance tests.'}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['import-history', 'verify'])
    args = parser.parse_args()
    try:
        import_history() if args.command == 'import-history' else verify()
    except (ValueError, KeyError, FileNotFoundError) as error:
        raise SystemExit(str(error))
