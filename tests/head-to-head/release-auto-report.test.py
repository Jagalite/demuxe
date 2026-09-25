# SPDX-License-Identifier: Apache-2.0
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('release_report', Path(__file__).with_name('release-auto-report.py'))
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class RoundPolicy(unittest.TestCase):
    def setUp(self):
        self.identity = {'assetsSHA256': 'asset', 'harnessSHA256': 'harness', 'browserIdentity': 'browser'}
        self.proof = (self.identity, {'status': 'passed'})

    def measurement(self, count, failed=None):
        cases = [{'round': i, 'status': 'failed' if i == failed else 'passed',
                  'measurement': {'oneCorePercent': 20 + i}, 'recordPath': str(i)} for i in range(1, count + 1)]
        return report.cpu(self.proof, ({**self.identity, 'benchmarkPolicy': {'schema': 2}}, cases, False))

    def test_three_default_rounds_and_five_optional_rounds(self):
        self.assertIsNone(self.measurement(2)[0])
        self.assertEqual(self.measurement(3)[0]['rounds'], 3)
        self.assertEqual(self.measurement(5)[0]['rounds'], 5)

    def test_failed_round_is_not_dropped_to_make_a_favorable_median(self):
        self.assertIsNone(self.measurement(5, failed=4)[0])

    def test_browser_identity_mismatch_rejects(self):
        with self.assertRaises(ValueError):
            report.identity(self.identity, {**self.identity, 'browserIdentity': 'different'})


if __name__ == '__main__':
    unittest.main()
