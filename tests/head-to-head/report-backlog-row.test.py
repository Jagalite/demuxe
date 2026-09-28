# SPDX-License-Identifier: Apache-2.0
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('reporter', pathlib.Path(__file__).with_name('report-backlog-row.py'))
reporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reporter)

def evidence(harness, cases, kind='correctness'):
    return dict(kind=kind, assetsSHA256='assets', harnessSHA256=harness,
                browserIdentity='browser', cases=[dict(id=case) for case in cases])

class CorrectedProofIdentity(unittest.TestCase):
    def test_replacement_rejects_cpu_from_superseded_harness(self):
        proofs = [evidence('old', ['jspi', 'asyncify']), evidence('new', ['asyncify'])]
        with self.assertRaisesRegex(AssertionError, 'selected correctness proof'):
            reporter.validate_cpu_proofs(proofs, [evidence('old', ['asyncify'], 'performance')])

    def test_unaffected_case_keeps_its_original_matching_cpu(self):
        proofs = [evidence('old', ['jspi', 'asyncify']), evidence('new', ['asyncify'])]
        reporter.validate_cpu_proofs(proofs, [evidence('old', ['jspi'], 'performance'),
                                            evidence('new', ['asyncify'], 'performance')])

if __name__ == '__main__':
    unittest.main()
