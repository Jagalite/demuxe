#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Reject partial or mismatched README catalogue release evidence."""
import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('lgpl_catalogue', ROOT / 'scripts/compare-lgpl-catalogue.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def sha(data):
    return hashlib.sha256(data).hexdigest()


class CatalogueGate(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = pathlib.Path(temp.name)
        self.original_root = gate.ROOT
        gate.ROOT = self.root
        self.addCleanup(lambda: setattr(gate, 'ROOT', self.original_root))
        rows = [f'Row {index}' for index in range(71)]
        (self.root / 'README.md').write_text('| Media format | Native video | Demuxe (auto) |\n'
                                             '| --- | --- | --- |\n' +
                                             ''.join(f'| {row} | n | d |\n' for row in rows) + '\n')
        (self.root / 'build').mkdir()
        artifacts = {name: {'sha256': sha(name.encode())} for name in gate.ENGINE_NAMES}
        (self.root / 'build/beta-build.json').write_text(json.dumps({
            'licensingEvidence': {'status': 'verified'}, 'artifacts': artifacts}))
        fixtures = {f'case{index}': {'label': row} for index, row in enumerate(rows)}
        for label in ('baseline', 'candidate'):
            assets = self.root / label / 'assets'
            (assets / 'fixtures').mkdir(parents=True)
            (assets / 'fixtures/catalogue.json').write_text(json.dumps(fixtures))
            files = {'fixtures/catalogue.json': {'sha256': sha(json.dumps(fixtures).encode())}}
            files.update({'demuxe/' + name: {'sha256': artifacts[name]['sha256'] if label == 'candidate'
                                                  else sha(('old:' + name).encode())}
                          for name in gate.ENGINE_NAMES})
            files.update({'demuxe/' + name: {'sha256': sha((label + ':' + name).encode())}
                          for name in gate.OPTIONAL_NAMES})
            for name in gate.ENGINE_NAMES:
                file = assets / 'demuxe' / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(name.encode() if label == 'candidate' else ('old:' + name).encode())
            for name in gate.OPTIONAL_NAMES:
                file = assets / 'demuxe' / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes((label + ':' + name).encode())
            for folder in ('engine-ass', 'engine-adaptation'):
                file = assets / 'demuxe/web' / folder / 'manifest.json'
                data = {'sourceBuildVerification': {'verified': True}}
                if folder == 'engine-adaptation':
                    data['profiles'] = ['flac', 'opus']
                file.write_text(json.dumps(data))
                files[str(file.relative_to(assets))] = {'sha256': gate.digest(file)}
            (assets / 'manifest.json').write_text(json.dumps({'files': files,
                                                              'optionalArchiveSHA256': sha(label.encode())}))
            cases = [{'id': 'demuxe.auto.' + name, 'fixture': name, 'status': 'passed',
                      'initial': {'route': 'native-direct'}} for name in fixtures]
            summary = {'kind': 'correctness', 'assets': str(assets),
                       'assetsSHA256': gate.digest(assets / 'manifest.json'),
                       'harnessSHA256': 'same-harness', 'browserIdentity': {'name': 'Chrome', 'version': '1'},
                       'selected': [case['id'] for case in cases], 'cases': cases}
            (self.root / label / 'summary.json').write_text(json.dumps(summary))

    def summary(self, name):
        return self.root / name / 'summary.json'

    def change(self, name, mutate):
        path = self.summary(name)
        data = json.loads(path.read_text())
        mutate(data)
        path.write_text(json.dumps(data))

    def test_complete_matched_passes(self):
        record = gate.compare(self.summary('baseline'), self.summary('candidate'))
        self.assertEqual((record['status'], record['rows'], record['counts']['stillPass']),
                         ('qualified', 71, 71))

    def test_preserves_existing_fixture_limit_and_failure(self):
        def limited(data):
            data['cases'][0].update(status='blocked', reason='Fixture unavailable',
                                    failureStage='preparation')
            data['cases'][1].update(status='failed', reason='Marked audio missing',
                                    failureStage='initial-output')
        self.change('baseline', limited)
        self.change('candidate', limited)
        record = gate.compare(self.summary('baseline'), self.summary('candidate'))
        self.assertEqual((record['status'], record['counts']['baselinePassedScreen'],
                          record['counts']['stillPass']), ('qualified', 69, 69))
        self.change('candidate', lambda data: data['cases'][1].update(reason='Different failure'))
        record = gate.compare(self.summary('baseline'), self.summary('candidate'))
        self.assertEqual((record['status'], record['counts']['preexistingLimitChanged']),
                         ('review-required', 1))

    def test_rejects_missing_case_changed_harness_and_new_regression(self):
        self.change('candidate', lambda data: data['cases'].pop())
        with self.assertRaisesRegex(ValueError, 'Incomplete or duplicated'):
            gate.compare(self.summary('baseline'), self.summary('candidate'))
        self.change('candidate', lambda data: data['cases'].append({
            'id': 'demuxe.auto.case70', 'fixture': 'case70', 'status': 'failed',
            'failureStage': 'subtitle-output'}))
        record = gate.compare(self.summary('baseline'), self.summary('candidate'))
        self.assertEqual((record['status'], record['counts']['regression']), ('review-required', 1))
        self.change('candidate', lambda data: data.update(harnessSHA256='changed'))
        with self.assertRaisesRegex(ValueError, 'different acceptance checks'):
            gate.compare(self.summary('baseline'), self.summary('candidate'))


if __name__ == '__main__':
    unittest.main()
