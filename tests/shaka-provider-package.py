#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Pinned optional runtime packaging; no native engine build or release grant."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('shaka_provider_audit', ROOT / 'scripts/audit-provider-package.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class ShakaProviderPackage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporary = tempfile.TemporaryDirectory()
        output = Path(cls.temporary.name).resolve()
        subprocess.run(['python3', 'scripts/prepare-provider-package.py', '--target', 'shaka', '--output', str(output)], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
        assembly = json.loads((output / 'assembly.json').read_text())
        cls.files = audit.archive_files(Path(assembly['archive']))
        cls.record = json.loads((output / 'build-inventory.json').read_text())
        cls.pin = json.loads((ROOT / 'third_party/shaka-player.json').read_text())

    @classmethod
    def tearDownClass(cls):
        cls.temporary.cleanup()

    def test_pinned_assets_and_every_upstream_notice_are_shipped(self):
        audit.audit('shaka', self.files, self.record)
        pin_digest = audit.sha((ROOT / 'third_party/shaka-player.json').read_bytes())
        self.assertEqual(self.record['runtimePin'], {'path': 'third_party/shaka-player.json', 'sha256': pin_digest})
        self.assertEqual(self.record['sources']['third_party/shaka-player.json'], {'sha256': pin_digest})
        for name, expected in self.pin['files'].items():
            self.assertEqual(audit.sha(self.files['runtime/' + name]), expected['sha256'])
        for notice in self.pin['notices']:
            self.assertEqual(audit.sha(self.files['THIRD_PARTY/shaka-player/' + notice['sourcePath']]), notice['sha256'])
        self.assertNotIn('engine-build.json', self.files)
        manifest = json.loads(self.files['provider-manifest.json'])
        self.assertEqual([provider['id'] for provider in manifest['provides']], ['shaka-adaptive'])
        self.assertEqual(manifest['provides'][0]['offers'], [{'capability': 'media.play.adaptive', 'profile': 'authorized-manifest', 'version': 1}])

    def test_self_consistent_mutant_still_fails_the_independent_upstream_pin(self):
        files, record = copy.deepcopy(self.files), copy.deepcopy(self.record)
        source = 'web/vendor/shaka-player.js'
        output = 'runtime/' + source
        changed = files[output] + b'\n/* changed upstream payload */\n'
        files[output] = changed
        record['files'][output]['sha256'] = audit.sha(changed)
        record['sources'][source]['sha256'] = audit.sha(changed)
        original = audit.local_bytes
        with patch.object(audit, 'local_bytes', side_effect=lambda name: changed if name == source else original(name)):
            with self.assertRaisesRegex(ValueError, 'Pinned runtime asset differs'):
                audit.audit('shaka', files, record)

    def test_missing_retained_notice_fails_even_with_an_updated_file_inventory(self):
        files, record = copy.deepcopy(self.files), copy.deepcopy(self.record)
        notice = 'THIRD_PARTY/shaka-player/third_party/cml-cmcd/NOTICE'
        del files[notice]
        del record['files'][notice]
        with self.assertRaisesRegex(ValueError, 'Required package/license/build material'):
                audit.audit('shaka', files, record)

    def test_changed_upstream_pin_is_not_accepted_as_the_reviewed_pin(self):
        changed = json.dumps({**self.pin, 'version': 'unreviewed'}).encode()
        original = audit.local_bytes
        with patch.object(audit, 'local_bytes', side_effect=lambda name: changed if name == 'third_party/shaka-player.json' else original(name)):
            with self.assertRaisesRegex(ValueError, 'Pinned runtime source record differs'):
                audit.audit('shaka', self.files, self.record)


if __name__ == '__main__':
    unittest.main()
