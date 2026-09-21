# SPDX-License-Identifier: Apache-2.0
import copy
import json
import subprocess
import sys
import os
import tempfile
import unittest
from pathlib import Path
from validate import BASE, expected_matrix, read, verify_matrix
from run_guard import resolve_run, require_writable_run

RUN = resolve_run(BASE)
TOOLS = Path(__file__).resolve().parent


class ReviewContracts(unittest.TestCase):
    def setUp(self):
        self.analysis = read(RUN / 'performance-analysis.json')

    def test_exact_recorded_matrix(self):
        self.assertEqual(verify_matrix(self.analysis), len(expected_matrix()))

    def test_missing_pair_rejected(self):
        self.analysis['rows'].pop()
        with self.assertRaises(AssertionError): verify_matrix(self.analysis)

    def test_duplicate_profile_cannot_replace_missing_profile(self):
        self.analysis['rows'][-1] = self.analysis['rows'][0]
        with self.assertRaises(AssertionError): verify_matrix(self.analysis)

    def test_recomputed_median_required(self):
        self.analysis['summary'][0]['metrics']['selectionMs']['unifiedMedian'] += 1
        with self.assertRaises(AssertionError): verify_matrix(self.analysis)

    def test_missing_summary_metric_rejected(self):
        self.analysis['summary'][0]['metrics'].pop('totalMs')
        with self.assertRaises(AssertionError): verify_matrix(self.analysis)

    def test_empty_preparation_assets_rejected(self):
        def incomplete(path):
            raw = copy.deepcopy(read(path))
            if raw['policy'] == 'all': raw['preparation']['report']['assets'] = []
            return raw
        with self.assertRaises(AssertionError): verify_matrix(self.analysis, incomplete)

    def test_new_run_is_writable_until_sealed(self):
        with tempfile.TemporaryDirectory(dir=BASE / 'evidence') as directory:
            run = Path(directory)
            self.assertEqual(require_writable_run(run), run.resolve())
            script = "import {requireWritableRun} from './research/items/unified-hybrid-software-engine/tests/run-guard.mjs'; await requireWritableRun(process.env.TEST_RUN);"
            env = {**os.environ, 'TEST_RUN': str(run)}
            subprocess.run(['node', '--input-type=module', '-e', script], env=env, check=True, capture_output=True)
            (run / 'manifest.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'Sealed evidence'): require_writable_run(run)
            p = subprocess.run(['node', '--input-type=module', '-e', script], env=env, capture_output=True, text=True)
            self.assertNotEqual(p.returncode, 0)
            self.assertIn('Sealed evidence', p.stderr)

    def test_generators_refuse_sealed_run(self):
        for name in ('build.py', 'prepare-runtime.py', 'analyze-pictures.py', 'analyze-performance.py',
                     'run-correctness.py', 'run-rotation.py', 'run-performance.py'):
            with self.subTest(name=name):
                p = subprocess.run([sys.executable, str(TOOLS / name)], capture_output=True, text=True)
                self.assertNotEqual(p.returncode, 0)
                self.assertIn('Sealed evidence is read-only', p.stderr)
        for name in ('browser.mjs', 'cache-contract.mjs'):
            with self.subTest(name=name):
                p = subprocess.run(['node', str(TOOLS / name)], capture_output=True, text=True)
                self.assertNotEqual(p.returncode, 0)
                self.assertIn('Sealed evidence is read-only', p.stderr)


if __name__ == '__main__':
    unittest.main()
