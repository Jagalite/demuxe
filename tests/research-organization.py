#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Research identity and license regressions; temporary fixtures, no media/builds."""
import contextlib
import copy
import hashlib
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from license_policy import Policy, LEGAL
import research


class ResearchLicenses(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in set(LEGAL) | {'package.json', 'package-lock.json', 'packages/core/package.json'}:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        (self.root / 'third_party').mkdir()
        (self.root / 'third_party/notices.json').write_text('[]')
        self.config = copy.deepcopy(Policy().config)
        self.config.update(coreSources=[], preservedFiles={}, licenseTextSHA256={})
        self.save_config()

    def save_config(self):
        (self.root / 'licensing/boundaries.json').write_text(json.dumps(self.config))

    def source(self, name, body):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body)

    def test_conflicting_captured_header_rejected(self):
        self.source('results/example.mjs', '// SPDX-License-Identifier: Apache-2.0\nexport {};\n')
        with self.assertRaisesRegex(ValueError, 'Research SPDX/map mismatch'):
            Policy(self.root).check()

    def test_code_cannot_fall_through_to_report_license(self):
        self.config['rules'].insert(0, {'paths': ['results/example.py'], 'license': 'CC-BY-4.0'})
        self.save_config()
        self.source('results/example.py', 'print(1)\n')
        with self.assertRaisesRegex(ValueError, 'Research code classified as report data'):
            Policy(self.root).check()

    def test_unknown_capture_preserves_terms_without_cc_grant(self):
        self.source('results/example.py', 'print(1)\n')
        self.assertEqual(Policy(self.root).classify('results/example.py'), 'NOASSERTION')
        Policy(self.root).check()

    def test_new_tool_requires_matching_spdx(self):
        name = 'research/items/R999.example/tests/probe.py'
        self.source(name, 'print(1)\n')
        with self.assertRaisesRegex(ValueError, 'Incorrect/missing SPDX header'):
            Policy(self.root).check()
        self.source(name, '# SPDX-License-Identifier: Apache-2.0\nprint(1)\n')
        Policy(self.root).check()

    def test_snapshot_does_not_acquire_tool_license(self):
        self.assertEqual(Policy(self.root).classify('research/items/R999.example/snapshots/worker.py'), 'NOASSERTION')


class ResearchIdentity(unittest.TestCase):
    def test_reused_id_requires_exact_mechanism(self):
        items = [{'key': 'R131.first', 'legacy_number': 131}, {'key': 'R131.second', 'legacy_number': 131}]
        with self.assertRaisesRegex(ValueError, 'Ambiguous local identity'):
            research.local_key({'stable_key': 'unknown', 'legacy_ids': ['R131']}, items)
        self.assertEqual(research.local_key({'stable_key': 'truthful-fmp4-seek-index'}, items),
                         'R131.global-mp4-sidx-materially-changes-remote-access.report-frontier')

    def test_outside_repository_reference_rejected(self):
        with self.assertRaises(ValueError):
            research.repo_path(Path('.'), '../outside-research.json')

    def test_import_refuses_to_overwrite_item_homes(self):
        with tempfile.TemporaryDirectory() as directory:
            area = Path(directory)
            (area / 'items').mkdir()
            with patch.object(research, 'AREA', area), self.assertRaisesRegex(ValueError, 'one-shot'):
                research.import_history()

    def test_verifier_rejects_tampering_and_premature_performance(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            area = root / 'research'
            key = 'R001.example'
            folder = area / 'items' / key
            artifact = root / 'results/value.json'
            artifact.parent.mkdir()
            artifact.write_text('{"passed": true}\n')
            pinned = {'sha256': research.digest(artifact), 'bytes': artifact.stat().st_size}
            research.write(root / research.CATALOGUE / 'catalogue/research_items.json', {'items': [{'key': key}]})
            research.write(area / 'migration.json', {'items': 1, 'source_sha256': {},
                           'archived_artifacts': {'results/value.json': pinned}, 'historical_hash_mismatches': [],
                           'item_imports': {key: {'history_records': 0, 'history_sha256': hashlib.sha256(b'').hexdigest(),
                                                 'artifacts': ['results/value.json']}}})
            research.write(area / 'index.json', {'items': [{'key': key, 'path': 'items/' + key}]})
            item = {'key': key, 'stages': {s: {'status': 'pending', 'basis': 'Unassessed.'} for s in research.STAGES},
                    'current_decision': {'record': {'state': 'pending'}}}
            research.write(folder / 'item.json', item)
            research.write(folder / 'evidence/index.json', {'key': key, 'artifacts': [{'path': 'results/value.json', **pinned}]})
            (folder / 'history.jsonl').write_text('')
            with patch.object(research, 'ROOT', root), patch.object(research, 'AREA', area), contextlib.redirect_stdout(io.StringIO()):
                research.verify()
                research.write(folder / 'evidence/index.json', {'key': key, 'artifacts': []})
                with self.assertRaises(SystemExit):
                    research.verify()
                research.write(folder / 'evidence/index.json', {'key': key, 'artifacts': [{'path': 'results/value.json', **pinned}]})
                artifact.write_text('{"passed": false}\n')
                with self.assertRaises(SystemExit):
                    research.verify()
                artifact.write_text('{"passed": true}\n')
                item['stages']['performance']['status'] = 'passed'
                research.write(folder / 'item.json', item)
                with self.assertRaises(SystemExit):
                    research.verify()


if __name__ == '__main__':
    unittest.main()
