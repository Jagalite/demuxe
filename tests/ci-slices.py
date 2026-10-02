#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Fail-closed catalog and cross-job artifact regression tests."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import sys
import hashlib
import io
import tarfile
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ci = load('ci_slices_test', 'ci-slices.py')
collector = load('ci_collect_test', 'collect-ci-providers.py')


class CatalogTests(unittest.TestCase):
    def test_ci_dependencies_are_in_independent_source_inventory(self):
        source = load('provider_source_ci_test', 'package-provider-source.py')
        paths = source.application_source_paths('audio-flac')
        required = {'sources.lock.json', 'scripts/ci-slices.py', 'scripts/build-ci-reference.py',
                    '.github/actions/reference-tools/action.yml', 'licensing/ci-slices.json'}
        required.update(row['evidence'] for row in ci.catalog())
        self.assertTrue(required <= paths, sorted(required - paths))
        self.assertTrue(all((ROOT / name).is_file() for name in required))

    def test_archive_audit_rejects_omitted_ci_inputs_with_valid_inventory(self):
        auditor = load('provider_ci_archive_auditor', 'audit-provider-package.py')
        catalog = json.loads(ci.CATALOG.read_text())
        required = {'sources.lock.json', 'scripts/ci-slices.py', 'scripts/build-ci-reference.py',
                    '.github/actions/reference-tools/action.yml', 'licensing/ci-slices.json'}
        required.update(row['evidence'] for row in catalog['include'])
        engine = {key: {} for key in ['inputs', 'sources', 'sdkSources', 'configurations', 'artifacts']}
        original = {'application/'+name: (ROOT/name).read_bytes() for name in required}
        original['engine-build.json'] = json.dumps(engine).encode()
        omissions = [None, 'sources.lock.json', 'licensing/ci-slices.json', 'scripts/ci-slices.py', 'scripts/build-ci-reference.py',
                     '.github/actions/reference-tools/action.yml',
                     'results/media-components/codec-expansion/ac3-fullfile.json']
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp)/'source.tar.gz'
            for omitted in omissions:
                with self.subTest(omitted=omitted):
                    contents = dict(original)
                    if omitted:
                        del contents['application/'+omitted]
                    # Recompute a valid inventory: this must fail for missing
                    # dependencies, even though every included byte is correct.
                    manifest = {'files': {name: hashlib.sha256(data).hexdigest() for name, data in contents.items()},
                                'excludedConfigurations': []}
                    contents['source-manifest.json'] = json.dumps(manifest).encode()
                    with tarfile.open(archive, 'w:gz') as packed:
                        for name, data in contents.items():
                            member = tarfile.TarInfo(name); member.size = len(data)
                            packed.addfile(member, io.BytesIO(data))
                    with patch.object(auditor, 'local_file', return_value=archive):
                        def verify():
                            auditor.verify_corresponding_source({'repositoryPath': str(archive)}, engine,
                                                                {'files': {}}, {'engines': []}, {})
                        if omitted:
                            with self.assertRaisesRegex(ValueError, 'Incomplete CI application source|Missing matching CI catalog evidence'):
                                verify()
                        else:
                            verify()

    def test_independent_slice_source_closure(self):
        source = load('provider_source_test', 'package-provider-source.py')
        paths = source.application_source_paths('audio-opus-encoder')
        self.assertTrue(all((ROOT / name).is_file() for name in paths))
        self.assertNotIn('web/engine-adaptation-asyncify/manifest.json', paths)
        self.assertIn('scripts/build-opus-provider.py', paths)

    def test_reviewed_catalog_is_complete_and_excludes_broad_providers(self):
        rows = ci.catalog()
        profiles = json.loads((ROOT / 'licensing/provider-packages.json').read_text())['profiles']
        self.assertEqual({row['target'] for row in rows}, set(profiles) - {'ffmpeg', 'ffmpeg-jspi', 'ffmpeg-asyncify', 'mpv'})
        self.assertEqual(sum(row['kind'] == 'audio' for row in rows), 23)
        self.assertEqual(sum(row['kind'] == 'preparation' for row in rows), 6)

    def reject_catalog(self, mutate):
        data = json.loads(ci.CATALOG.read_text())
        mutate(data)
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / 'catalog.json'
            candidate.write_text(json.dumps(data))
            with patch.object(ci, 'CATALOG', candidate), self.assertRaises(ValueError):
                ci.catalog()

    def test_duplicate_target(self):
        self.reject_catalog(lambda data: data['include'].append(copy.deepcopy(data['include'][0])))

    def test_unreviewed_target(self):
        self.reject_catalog(lambda data: data['include'][0].update(target='audio-new'))

    def test_evidence_drift(self):
        self.reject_catalog(lambda data: data['include'][0].update(evidenceSHA256='0' * 64))

    def test_recipe_substitution(self):
        self.reject_catalog(lambda data: data['include'][0].update(profile='opus-encoder'))

    def test_absent_cross_job_artifacts(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'out'
            with self.assertRaisesRegex(ValueError, 'Missing CI providers'):
                collector.collect(Path(tmp), output)
            self.assertFalse(output.exists())

    def test_wrong_revision_artifact(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'ci-artifacts.json').write_text(json.dumps({'schema': 1, 'target': 'audio-ac3', 'commit': '0' * 40}))
            with self.assertRaisesRegex(ValueError, 'wrong-revision'):
                collector.collect(root, root / 'out')

    def test_changed_cross_job_bytes(self):
        import subprocess
        commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'candidate.tgz').write_bytes(b'changed')
            (root / 'ci-artifacts.json').write_text(json.dumps({'schema': 1, 'target': 'audio-ac3', 'commit': commit,
                'files': {'candidate.tgz': {'bytes': 7, 'sha256': '0' * 64}}}))
            with self.assertRaisesRegex(ValueError, 'artifact drift'):
                collector.collect(root, root / 'out')


if __name__ == '__main__':
    unittest.main()
