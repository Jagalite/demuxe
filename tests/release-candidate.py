#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exercise candidate identity guards without publishing a tag or release."""
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('candidate', ROOT / 'scripts/prepare-release-candidate.py')
candidate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(candidate)


class CandidateGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git('init', '-q')
        self.git('config', 'user.name', 'Candidate test')
        self.git('config', 'user.email', 'candidate@example.test')
        (self.root / 'package.json').write_text(json.dumps({'version': '1.1.2'}))
        self.git('add', 'package.json')
        self.git('commit', '-qm', 'candidate')
        self.commit = self.git('rev-parse', 'HEAD')

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, text=True).strip()

    def test_exact_clean_candidate_is_repeatable_and_local(self):
        for _ in range(2):
            record = candidate.prepare('v1.1.2', self.commit, self.root)
            self.assertEqual(record['sourceCommit'], self.commit)
            self.assertEqual(record['publication'], 'awaiting-approval')
        self.assertEqual(self.git('rev-parse', 'v1.1.2'), self.commit)
        self.assertEqual(self.git('remote'), '')

    def test_wrong_commit_or_version_cannot_create_tag(self):
        for tag, commit in [('v1.1.1', self.commit), ('v1.1.2', '0' * 40), ('v1.1.2', 'HEAD')]:
            with self.assertRaises(ValueError):
                candidate.prepare(tag, commit, self.root)
        self.assertEqual(self.git('tag'), '')

    def test_dirty_source_cannot_create_tag(self):
        (self.root / 'unexpected').write_text('dirty')
        with self.assertRaisesRegex(ValueError, 'clean'):
            candidate.prepare('v1.1.2', self.commit, self.root)
        self.assertEqual(self.git('tag'), '')

    def test_existing_tag_cannot_move(self):
        self.git('tag', 'v1.1.2')
        self.git('commit', '--allow-empty', '-qm', 'next')
        with self.assertRaisesRegex(ValueError, 'different commit'):
            candidate.prepare('v1.1.2', self.git('rev-parse', 'HEAD'), self.root)
        self.assertEqual(self.git('rev-parse', 'v1.1.2'), self.commit)

    def test_workflow_keeps_publication_out_of_candidate_runs(self):
        workflow = (ROOT / '.github/workflows/pages.yml').read_text()
        self.assertIn("if: always() && !inputs.qualify_only && needs.build.result", workflow)
        self.assertIn("  release:\n    needs: [build, providers, webkit]\n    if: github.event_name == 'push'", workflow)
        self.assertIn("(github.event_name == 'push' && needs.release.result == 'success') || (github.event_name == 'release'", workflow)
        self.assertIn("if: '!inputs.qualify_only'", workflow)
        self.assertIn("if: github.event_name == 'push' || inputs.qualify_only\n    needs: build", workflow)


if __name__ == '__main__':
    unittest.main()
