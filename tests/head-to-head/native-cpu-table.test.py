#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('native_table', Path(__file__).with_name('render-native-cpu-table.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class NativeBaseline(unittest.TestCase):
    def evidence(self, native=(10, 10, 10), player=(20, 20, 20)):
        identity = {'assetsSHA256': 'assets', 'harnessSHA256': 'harness', 'browserIdentity': 'browser'}
        correctness = {('f', p): (dict(identity), {'status': 'passed'}) for p in ['video', 'libmedia']}
        performance = {('f', p): [(dict(identity), {'status': 'passed', 'round': i + 1,
            'recordPath': f'{p}/{i}', 'measurement': {'oneCorePercent': cpu}}) for i, cpu in enumerate(values)]
            for p, values in [('video', native), ('libmedia', player)]}
        return correctness, performance

    def test_native_is_denominator_and_demuxe_is_not_required(self):
        c, p = self.evidence()
        result = m.compare('f', 'libmedia', c, p, {})
        self.assertEqual(result['medianGainPercent'], -100)
        self.assertEqual(result['playerMedianCPU'], 20)
        self.assertEqual(m.cell(result, 'libmedia'), '🟠 (-100.0%)')
        self.assertIn('playerRecord', result['pairs'][0])

    def test_positive_reduction(self):
        c, p = self.evidence(player=(5, 5, 5))
        self.assertEqual(m.cell(m.compare('f', 'libmedia', c, p, {}), 'libmedia'), '🟢 (+50.0%)')

    def test_pass_uses_range_not_median_or_rounding(self):
        c, p = self.evidence(player=(9, 9, 11))
        result = m.compare('f', 'libmedia', c, p, {})
        self.assertEqual(result['medianGainPercent'], 10)
        self.assertEqual(m.cell(result, 'libmedia'), '🔵 (Pass)')
        self.assertEqual(m.cell(m.compare('f', 'video', c, p, {}), 'video'), '🔵 (Pass)')

    def test_rejected_native_round_is_not_pass(self):
        c, p = self.evidence()
        p[('f', 'video')][1][1].update(status='failed', reason='Dropped frames')
        result = m.compare('f', 'libmedia', c, p, {})
        self.assertEqual(m.cell(result, 'libmedia'), '⚪ (N/A)')
        self.assertEqual(result['reason'], 'Dropped frames')

    def test_missing_mismatched_and_zero_baselines(self):
        for mode in ['missing', 'identity', 'zero', 'duplicate']:
            c, p = self.evidence()
            if mode == 'missing': p[('f', 'video')].pop()
            if mode == 'identity': p[('f', 'video')][0][0]['assetsSHA256'] = 'different'
            if mode == 'zero': p[('f', 'video')][0][1]['measurement']['oneCorePercent'] = 0
            if mode == 'duplicate': p[('f', 'video')][0][1]['round'] = 2
            self.assertEqual(m.compare('f', 'libmedia', c, p, {})['status'], 'unmeasured', mode)

    def test_correctness_failure_and_fidelity_are_distinct(self):
        c, p = self.evidence()
        c[('f', 'libmedia')][1].update(status='failed', reason='Wrong audio')
        self.assertEqual(m.cell(m.compare('f', 'libmedia', c, p, {}), 'libmedia'), '🔴 (Fail)')
        self.assertEqual(m.cell(m.compare('f', 'video', c, p, {'qualificationLimit': 'HDR fidelity'}), 'video'), '🟡 (N/A)')


if __name__ == '__main__':
    unittest.main()
