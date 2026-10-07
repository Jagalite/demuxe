#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Synthetic release handoff and registry guards; never publishes to npm."""
import base64
import hashlib
import importlib.util
import io
import json
import pathlib
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('publisher', pathlib.Path(__file__).resolve().parents[1] / 'scripts/publish-npm-release.py')
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)
TAG = 'v0.3.0-beta.4-rc.20'
COMMIT = 'a' * 40


def tar(path, files):
    with tarfile.open(path, 'w:gz') as archive:
        for name, value in files.items():
            data = json.dumps(value).encode()
            member = tarfile.TarInfo(name)
            member.size = len(data)
            archive.addfile(member, io.BytesIO(data))


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.directory = pathlib.Path(self.tmp.name)
        source = self.directory / 'demuxe-source.tar.gz'
        tar(source, {'source-manifest.json': {'sourceTag': TAG, 'sourceCommit': COMMIT}})
        self.package = {'name': 'demuxe', 'version': '0.3.0-beta.4'}
        self.manifest = {'version': self.package['version'], 'sourceTag': TAG, 'sourceCommit': COMMIT,
                         'dirtySource': False, 'sourceArchive': {'filename': source.name, 'sha256': publisher.digest(source)}}
        self.archive = self.directory / 'demuxe.tgz'
        self.record = {'status': 'developer-beta-candidate-tested', 'sourceTag': TAG, 'sourceCommit': COMMIT,
                       'source': {'file': source.name, 'sha256': publisher.digest(source)},
                       'tests': [{'suite': suite, 'sha256': 'b' * 64} for suite in (
                           'lgpl-complete-readme-catalogue', 'public-api-component-cli-exports-typescript', 'range-reader-deadline')] +
                       [{'browser': browser, 'cases': 6, 'sha256': 'c' * 64}
                        for browser in ('chrome', 'firefox') for _ in range(2)]}
        self.repack()

    def repack(self, extra=None):
        package_bytes = json.dumps(self.package).encode()
        self.manifest['files'] = {'package.json': {'sha256': hashlib.sha256(package_bytes).hexdigest()}}
        tar(self.archive, {'package/package.json': self.package, 'package/release-manifest.json': self.manifest, **(extra or {})})
        self.record['runtime'] = {'file': self.archive.name, 'sha256': publisher.digest(self.archive)}
        self.write_record()

    def write_record(self):
        (self.directory / 'verification.json').write_text(json.dumps(self.record))

    def validate(self):
        return publisher.validate(self.directory, TAG, COMMIT)

    def test_reduced_catalogue_evidence_cannot_publish(self):
        for suite in ['lgpl-mini-catalogue','lgpl-all-fixtures-smoke']:
            self.record['tests'][0]['suite']=suite
            self.write_record()
            with self.assertRaisesRegex(ValueError,'qualification suites'):self.validate()

    def test_valid_rc_tag_can_identify_beta_package(self):
        self.assertEqual(self.validate(), (self.archive, '0.3.0-beta.4'))

    def test_tampered_archive(self):
        with self.archive.open('ab') as file:
            file.write(b'tampered')
        with self.assertRaisesRegex(ValueError, 'runtime archive hash mismatch'):
            self.validate()

    def test_wrong_tag_and_commit(self):
        for field in ('sourceTag', 'sourceCommit'):
            with self.subTest(field=field):
                original = self.record[field]
                self.record[field] = 'wrong'
                self.write_record()
                with self.assertRaisesRegex(ValueError, 'checked-out release tag'):
                    self.validate()
                self.record[field] = original

    def test_unqualified_record(self):
        self.record['tests'] = self.record['tests'][1:]
        self.write_record()
        with self.assertRaisesRegex(ValueError, 'qualification suites'):
            self.validate()

    def test_dirty_package(self):
        self.manifest['dirtySource'] = True
        self.repack()
        with self.assertRaisesRegex(ValueError, 'tagged source'):
            self.validate()

    def stable_package(self, tag='v1.1.0'):
        self.package['version'] = self.manifest['version'] = '1.1.0'
        self.manifest['sourceTag'] = self.record['sourceTag'] = tag
        source = self.directory / self.record['source']['file']
        tar(source, {'source-manifest.json': {'sourceTag': tag, 'sourceCommit': COMMIT}})
        self.manifest['sourceArchive']['sha256'] = self.record['source']['sha256'] = publisher.digest(source)
        self.repack()

    def test_verified_stable_package(self):
        self.stable_package()
        self.assertEqual(publisher.validate(self.directory, 'v1.1.0', COMMIT), (self.archive, '1.1.0'))

    def test_stable_package_requires_matching_tag(self):
        self.stable_package(TAG)
        with self.assertRaisesRegex(ValueError, 'Stable release tag'):
            self.validate()

    def test_stable_package_still_requires_qualification(self):
        self.stable_package()
        self.record['tests'] = self.record['tests'][1:]
        self.write_record()
        with self.assertRaisesRegex(ValueError, 'qualification suites'):
            publisher.validate(self.directory, 'v1.1.0', COMMIT)

    def test_unlisted_member(self):
        self.repack({'package/surprise.json': {}})
        with self.assertRaisesRegex(ValueError, 'inventory mismatch'):
            self.validate()

    def test_missing_optional_qualification(self):
        self.manifest['optionalQualificationRequired'] = True
        self.repack()
        with self.assertRaisesRegex(ValueError, 'optional runtime qualification'):
            self.validate()

    def test_missing_source_or_unsafe_asset(self):
        self.record['source']['file'] = '../outside.tar.gz'
        self.write_record()
        with self.assertRaisesRegex(ValueError, 'Invalid release asset'):
            self.validate()

    def metadata(self):
        return {'dist': {'integrity': 'sha512-' + base64.b64encode(bytes.fromhex(publisher.digest(self.archive, 'sha512'))).decode()}}

    def test_identical_existing_version_does_not_publish(self):
        with patch.object(publisher, 'registry_version', return_value=self.metadata()), patch.object(publisher.subprocess, 'run') as run:
            publisher.stage(self.archive, '0.3.0-beta.4')
            run.assert_not_called()

    def test_existing_conflict_does_not_publish(self):
        with patch.object(publisher, 'registry_version', return_value={'dist': {'integrity': 'wrong'}}), patch.object(publisher.subprocess, 'run') as run:
            with self.assertRaisesRegex(ValueError, 'different archive bytes'):
                publisher.stage(self.archive, '0.3.0-beta.4')
            run.assert_not_called()

    def test_new_version_stages_without_waiting_for_publication(self):
        with patch.object(publisher, 'registry_version', return_value=None) as lookup, patch.object(publisher.subprocess, 'run') as run:
            publisher.stage(self.archive, '0.3.0-beta.4')
            lookup.assert_called_once_with('0.3.0-beta.4')
            run.assert_called_once()
            command = run.call_args.args[0]
            self.assertEqual(command[:4], ['npm', 'stage', 'publish', str(self.archive.resolve())])
            self.assertIn('--ignore-scripts', command)
            self.assertIn('--provenance', command)
            self.assertEqual(command[command.index('--tag') + 1], 'latest')

    def test_staging_failure_does_not_fall_back_to_direct_publish(self):
        error = publisher.subprocess.CalledProcessError(1, ['npm', 'stage', 'publish'])
        with patch.object(publisher, 'registry_version', return_value=None), patch.object(publisher.subprocess, 'run', side_effect=error) as run:
            with self.assertRaises(publisher.subprocess.CalledProcessError):
                publisher.stage(self.archive, '0.3.0-beta.4')
            run.assert_called_once()
            self.assertEqual(run.call_args.args[0][:3], ['npm', 'stage', 'publish'])


if __name__ == '__main__':
    unittest.main()
