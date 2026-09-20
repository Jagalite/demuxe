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

    def test_measured_percentage_is_shown_even_when_range_crosses_zero(self):
        c, p = self.evidence(player=(9, 9, 11))
        result = m.compare('f', 'libmedia', c, p, {})
        self.assertEqual(result['medianGainPercent'], 10)
        self.assertEqual(m.cell(result, 'libmedia'), '🟢 (+10.0%)')
        self.assertEqual(m.cell(m.compare('f', 'video', c, p, {}), 'video'), '🟢 (Pass)')

    def test_rejected_native_round_keeps_cpu_unmeasured(self):
        c, p = self.evidence()
        p[('f', 'video')][1][1].update(status='failed', reason='Dropped frames')
        result = m.compare('f', 'libmedia', c, p, {})
        self.assertEqual(m.cell(result, 'libmedia'), '🟢 (Pass)')
        self.assertEqual(result['status'], 'unmeasured')
        self.assertEqual(result['reason'], 'Dropped frames')

    def test_playback_pass_survives_absent_native_baseline(self):
        c, p = self.evidence()
        c[('f', 'video')][1]['status'] = 'failed'
        result = m.compare('f', 'libmedia', c, p, {})
        self.assertEqual(m.cell(result, 'libmedia'), '🟢 (Pass)')
        self.assertEqual(result['status'], 'unmeasured')
        del c[('f', 'libmedia')]
        self.assertEqual(m.cell(m.compare('f', 'libmedia', c, p, {}), 'libmedia'), '⚪ (N/A)')

    def test_missing_mismatched_and_zero_baselines(self):
        for mode in ['missing', 'identity', 'zero', 'duplicate']:
            c, p = self.evidence()
            if mode == 'missing': p[('f', 'video')].pop()
            if mode == 'identity': p[('f', 'video')][0][0]['assetsSHA256'] = 'different'
            if mode == 'zero': p[('f', 'video')][0][1]['measurement']['oneCorePercent'] = 0
            if mode == 'duplicate': p[('f', 'video')][0][1]['round'] = 2
            self.assertEqual(m.compare('f', 'libmedia', c, p, {})['status'], 'unmeasured', mode)

    def test_historical_screen_pass_does_not_qualify_cpu(self):
        historical = {('f', 'libmedia'): {'status': 'blocked', 'screenPassed': True, 'recordPath': 'old/result.json'}}
        result = m.compare('f', 'libmedia', {}, {}, {'qualificationLimit': 'HDR fidelity'}, historical)
        self.assertEqual(m.cell(result, 'libmedia'), '🟢 (Pass)*')
        self.assertEqual(result['status'], 'unmeasured')
        self.assertNotIn('medianGainPercent', result)
        historical[('f', 'libmedia')]['screenPassed'] = False
        self.assertEqual(m.cell(m.compare('f', 'libmedia', {}, {}, {'qualificationLimit': 'HDR'}, historical), 'libmedia'), '🟡 (N/A)')

    def test_historical_failures_and_missing_fixtures_stay_distinct(self):
        historical = {('f', 'libmedia'): {'status': 'failed', 'reason': 'Audio failed', 'recordPath': 'old/result.json'}}
        result = m.compare('f', 'libmedia', {}, {}, {'qualificationLimit': 'Surround'}, historical)
        self.assertEqual(m.cell(result, 'libmedia'), '🔴 (Fail)')
        result = m.compare('f', 'libmedia', {}, {}, {'blockedReason': 'No fixture'}, historical)
        self.assertEqual(m.cell(result, 'libmedia'), '⚪ (N/A)')

    def test_historical_pass_cannot_override_new_failure(self):
        c, p = self.evidence()
        c[('f', 'libmedia')][1].update(status='failed', reason='New failure')
        historical = {('f', 'libmedia'): {'status': 'blocked', 'screenPassed': True, 'recordPath': 'old/result.json'}}
        result = m.compare('f', 'libmedia', c, p, {'qualificationLimit': 'HDR'}, historical)
        self.assertEqual(m.cell(result, 'libmedia'), '🔴 (Fail)')
        self.assertEqual(result['reason'], 'New failure')

    def test_leader_can_be_any_player_and_native_is_compared(self):
        c, p = self.evidence(native=(10, 10, 10), player=(5, 5, 5))
        self.assertEqual(m.select_leader('f', c, p, {}), 'libmedia')
        result = m.compare('f', 'video', c, p, {}, baseline='libmedia')
        self.assertEqual(result['gainPercent'], -100)
        self.assertEqual(m.cell(result, 'video'), '🟠 (-100.0%)')

    def test_failed_fast_candidate_cannot_lead(self):
        c, p = self.evidence(player=(1, 1, 1))
        p[('f', 'libmedia')][1][1]['status'] = 'failed'
        self.assertEqual(m.select_leader('f', c, p, {}), 'video')
        self.assertIsNone(m.select_leader('f', c, p, {'qualificationLimit': 'HDR'}))

    def test_leader_requires_comparable_profiles_and_stable_ties(self):
        c, p = self.evidence(player=(10, 10, 10))
        self.assertEqual(m.select_leader('f', c, p, {}), 'video')
        c[('f', 'libmedia')][0]['browserIdentity'] = 'other'
        for identity, _ in p[('f', 'libmedia')]: identity['browserIdentity'] = 'other'
        self.assertIsNone(m.select_leader('f', c, p, {}))

    def test_display_uses_ratio_of_medians(self):
        c, p = self.evidence(native=(10, 20, 30), player=(12, 40, 35))
        result = m.compare('f', 'libmedia', c, p, {})
        self.assertEqual(result['gainPercent'], -75)
        self.assertNotEqual(result['gainPercent'], result['medianGainPercent'])

    def test_every_pass_is_bold_without_bolding_percentages(self):
        c, p = self.evidence()
        leader = m.compare('f', 'video', c, p, {})
        self.assertEqual(m.table_cell(leader, 'video'), '**🟢 (Pass)**')
        self.assertEqual(m.table_cell({'status': 'unmeasured', 'playbackPassed': True}, 'demuxe'), '**🟢 (Pass)**')
        self.assertEqual(m.table_cell({'status': 'unmeasured', 'screeningPassed': True}, 'demuxe'), r'**🟢 (Pass)\***')
        self.assertEqual(m.table_cell(m.compare('f', 'libmedia', c, p, {}), 'libmedia'), '🟠 (-100.0%)')

    def test_correctness_failure_and_fidelity_are_distinct(self):
        c, p = self.evidence()
        c[('f', 'libmedia')][1].update(status='failed', reason='Wrong audio')
        self.assertEqual(m.cell(m.compare('f', 'libmedia', c, p, {}), 'libmedia'), '🔴 (Fail)')
        self.assertEqual(m.cell(m.compare('f', 'video', c, p, {'qualificationLimit': 'HDR fidelity'}), 'video'), '🟡 (N/A)')


if __name__ == '__main__':
    unittest.main()
