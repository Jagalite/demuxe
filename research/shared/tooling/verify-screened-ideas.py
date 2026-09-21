#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Verify D01-D73 incorporation and archive bytes without executing imported code."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[3]


def read(path):
    return json.loads(path.read_text())


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    campaign = read(ROOT / 'research/campaigns/screened-ideas-d01-d73.json')
    run = ROOT / 'research/shared/runs' / campaign['run_id']
    records = read(run / 'reconciliation.json')['records']
    assert [r['id'] for r in records] == [f'D{i:02}' for i in range(1, 74)]
    assert {r['key'] for r in records} == set(campaign['items'])
    manifest = read(run / 'manifest.json')
    for artifact in manifest['artifacts']:
        data = (ROOT / artifact['path']).read_bytes()
        assert len(data) == artifact['bytes'], artifact['path']
        assert digest(data) == artifact['sha256'], artifact['path']
    members = read(run / 'archive-members.json')['members']
    archives = {}
    try:
        for member in members:
            name = member['archive']
            if name not in archives:
                archives[name] = zipfile.ZipFile(ROOT / name)
            data = archives[name].read(member['member'])
            assert digest(data) == member['sha256'], member
            assert len(data) == member['bytes'], member
            if member['materialized_path']:
                assert (ROOT / member['materialized_path']).read_bytes() == data
    finally:
        for archive in archives.values():
            archive.close()
    assert len(archives) == 17
    preserved = read(run / 'preservation.json')['existing_items']
    # History is append-only. Current decisions may legitimately advance later;
    # their pre-import state is captured here for the initial incorporation audit.
    for key, original in preserved.items():
        folder = ROOT / 'research/items' / key
        prefix = (folder / 'history.jsonl').read_bytes()[:original['history_bytes']]
        assert digest(prefix) == original['history_sha256'], key
    for key in campaign['items']:
        folder = ROOT / 'research/items' / key
        item = read(folder / 'item.json')
        supplements = [s for s in item['external_screenings'] if s['run_id'] == campaign['run_id']]
        assert len(supplements) == 1, key
        expected = [r for r in records if r['key'] == key]
        assert supplements[0]['ids'] == [r['id'] for r in expected], key
        assert read(ROOT / supplements[0]['path'])['records'] == expected, key
        evidence = read(folder / 'evidence/index.json')['artifacts']
        indexed = {a['path']: a for a in evidence}
        for record in expected:
            for path in [record['report'], record['handoff'], record['original_archive'], supplements[0]['path']]:
                if path:
                    assert path in indexed, path
                    assert digest((ROOT / path).read_bytes()) == indexed[path]['sha256'], path
            assert record['maintained_player_executed_this_import'] is False
            assert record['performance_claim_this_import'] is False
    print(json.dumps({'passed': True, 'screens': len(records), 'batches': len(archives),
                      'owners': len(campaign['items']), 'new_items': len(campaign['new_items']),
                      'pinned_files': len(manifest['artifacts']), 'archive_members': len(members),
                      'preserved_history_prefixes': len(preserved),
                      'scope': 'Import integrity and organization; no media execution.'}, indent=2))


if __name__ == '__main__':
    main()
