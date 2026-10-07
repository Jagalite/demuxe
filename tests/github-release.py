#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Check release classification without contacting GitHub or publishing."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('github_release', Path(__file__).resolve().parents[1] / 'scripts/publish-github-release.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class ReleaseTests(unittest.TestCase):
    def publish(self, version, existing=None):
        calls = []

        def gh(*args):
            calls.append(args)
            if args[0] == 'api':
                return json.dumps([[{'tag_name': 'v' + version}]] if existing else [[]])
            if args[:2] == ('release', 'view'):
                return json.dumps(existing or {'isDraft': True, 'isPrerelease': False, 'assets': []})
            return ''

        with tempfile.TemporaryDirectory() as directory, patch.object(publisher.verify, 'validate', return_value=(Path('runtime.tgz'), version)), patch.object(publisher, 'gh', side_effect=gh):
            publisher.publish(Path(directory), 'v' + version, 'a' * 40, 'owner/repo')
        return calls

    def test_stable_is_latest_and_not_prerelease(self):
        calls = self.publish('1.1.0')
        create = next(call for call in calls if call[:2] == ('release', 'create'))
        edit = next(call for call in calls if call[:2] == ('release', 'edit'))
        self.assertNotIn('--prerelease', create)
        self.assertIn('--prerelease=false', edit)
        self.assertIn('--latest=true', edit)

    def test_rc_remains_prerelease(self):
        calls = self.publish('1.1.0-rc.4')
        create = next(call for call in calls if call[:2] == ('release', 'create'))
        edit = next(call for call in calls if call[:2] == ('release', 'edit'))
        self.assertIn('--prerelease', create)
        self.assertIn('--prerelease=true', edit)
        self.assertIn('--latest=false', edit)

    def test_published_classification_conflict_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'classification differs'):
            self.publish('1.1.0', {'isDraft': False, 'isPrerelease': True, 'assets': []})

    def test_qualification_failure_prevents_github_calls(self):
        with patch.object(publisher.verify, 'validate', side_effect=ValueError('Release is not qualified')), patch.object(publisher, 'gh') as gh:
            with self.assertRaisesRegex(ValueError, 'not qualified'):
                publisher.publish(Path('.'), 'v1.1.0', 'a' * 40, 'owner/repo')
            gh.assert_not_called()


if __name__ == '__main__':
    unittest.main()
