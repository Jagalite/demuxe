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

    def build_only(self):
        build = self.directory / 'engine-build.json'
        build.write_text(json.dumps({'clean': True, 'artifacts': self.manifest['files']}))
        self.record.update(status='developer-beta-build-only', tests=[],
                           qualification='Build-only beta; browser and catalogue qualification skipped',
                           build={'file': build.name, 'sha256': publisher.digest(build)})
        self.write_record()

    def test_build_only_beta_skips_browser_and_optional_evidence(self):
        self.manifest.update(optionalQualificationRequired=True, adaptiveStreaming=True)
        self.repack()
        self.build_only()
        self.assertEqual(self.validate(), (self.archive, '0.3.0-beta.4'))

    def test_build_only_requires_matching_clean_build(self):
        self.build_only()
        path = self.directory / 'engine-build.json'
        original = json.loads(path.read_text())
        for change, error in [({'clean': False}, 'clean engine build'),
                              ({'artifacts': {'package.json': {'sha256': '0' * 64}}},
                               'Engine build differs')]:
            path.write_text(json.dumps({**original, **change}))
            self.record['build']['sha256'] = publisher.digest(path)
            self.write_record()
            with self.assertRaisesRegex(ValueError, error):
                self.validate()
        path.write_text('tampered')
        with self.assertRaisesRegex(ValueError, 'build record hash mismatch'):
            self.validate()

    def test_build_only_preserves_runtime_hash_and_beta_restriction(self):
        self.build_only()
        with self.archive.open('ab') as file:
            file.write(b'tampered')
        with self.assertRaisesRegex(ValueError, 'runtime archive hash mismatch'):
            self.validate()
        self.package['version'] = '0.3.0-rc.1'
        self.manifest['version'] = self.package['version']
        self.repack()
        self.build_only()
        with self.assertRaisesRegex(ValueError, 'restricted to beta'):
            self.validate()

    def test_build_only_requires_explicit_skipped_status(self):
        self.build_only()
        self.record['qualification'] = 'Qualified developer beta'
        self.write_record()
        with self.assertRaisesRegex(ValueError, 'disclose skipped'):
            self.validate()

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

    def test_dirty_and_stable_packages(self):
        self.manifest['dirtySource'] = True
        self.repack()
        with self.assertRaisesRegex(ValueError, 'tagged source'):
            self.validate()
        self.package['version'] = '0.3.0'
        self.repack()
        with self.assertRaisesRegex(ValueError, 'Only prerelease'):
            self.validate()

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
            self.assertEqual(command[command.index('--tag') + 1], 'beta')

    def test_staging_failure_does_not_fall_back_to_direct_publish(self):
        error = publisher.subprocess.CalledProcessError(1, ['npm', 'stage', 'publish'])
        with patch.object(publisher, 'registry_version', return_value=None), patch.object(publisher.subprocess, 'run', side_effect=error) as run:
            with self.assertRaises(publisher.subprocess.CalledProcessError):
                publisher.stage(self.archive, '0.3.0-beta.4')
            run.assert_called_once()
            self.assertEqual(run.call_args.args[0][:3], ['npm', 'stage', 'publish'])


if __name__ == '__main__':
    unittest.main()
