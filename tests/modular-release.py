#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exercise modular release rejection without network or publication."""
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('modular_release', Path(__file__).resolve().parents[1] / 'scripts/modular-release.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class HandoffTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.addCleanup(self.tmp.cleanup)
        self.files = {}
        self.packages = []
        targets = ['audio-ac3', 'audio-dts', 'audio-common', 'audio-flac', 'audio-truehd-mlp',
                   'audio-dts-hd', 'container', 'ffmpeg-truehd-mlp-asyncify',
                   'ffmpeg-truehd-mlp-jspi', 'ffmpeg-dts-hd-asyncify', 'ffmpeg-dts-hd-jspi']
        assemblies = []
        for target in ['core', *targets]:
            name = 'demuxe' if target == 'core' else '@demuxe/provider-' + target
            filename = target + '.tgz'
            data = json.dumps({'name': name, 'version': '1.0.0-beta.1'}).encode()
            with tarfile.open(self.root / filename, 'w:gz') as tar:
                info = tarfile.TarInfo('package/package.json'); info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
            self.files[filename] = release.digest(self.root / filename)
            self.packages.append({'file': filename, 'name': name, 'sha256': self.files[filename]})
            if target != 'core':
                assemblies.append({'target': target, 'sha256': self.files[filename]})
        self.put('application-source.tar.gz', b'source')
        self.put('native-source.tar.gz', b'native source')
        self.put('gate.json', json.dumps({'passed': True}).encode())
        qualification = {'passed': True, 'ordinaryQualifiedAssembly': True,
            'finalCoreMatchesInstalledTests': True, 'coreArchiveSHA256': self.files['core.tgz'],
            'packages': assemblies, 'gates': [{'path': 'gate-' + str(i), 'sha256': self.files['gate.json']} for i in range(29)],
            'applicationSourceRebuild': {'passed': True, 'sourceSHA256': self.files['application-source.tar.gz'],
                'coreArchiveSHA256': self.files['core.tgz']},
            'applicationSource': {'verification': {'passed': True, 'archive': 'application-source.tar.gz',
                'sha256': self.files['application-source.tar.gz'], 'nativeSourceCompanions': [
                    {'filename': 'native-source.tar.gz', 'sha256': self.files['native-source.tar.gz']}]}}}
        self.put('qualification.json', json.dumps(qualification).encode())
        self.record = {'schema': 1, 'passed': True, 'sourceTag': 'modular-v1', 'sourceCommit': 'abc',
            'cleanTaggedSource': True, 'version': '1.0.0-beta.1', 'core': 'core.tgz',
            'qualification': 'qualification.json', 'packages': self.packages,
            'files': self.files, 'evidenceFiles': {'gate-' + str(i): 'gate.json' for i in range(29)}}
        self.save()

    def put(self, name, data):
        (self.root / name).write_bytes(data)
        self.files[name] = release.digest(self.root / name)

    def save(self):
        (self.root / 'modular-verification.json').write_text(json.dumps(self.record))

    def test_complete_handoff(self):
        self.assertEqual(len(release.validate(self.root, 'modular-v1', 'abc')['packages']), 12)

    def test_wrong_revision_rejected(self):
        with self.assertRaisesRegex(ValueError, 'tag and commit'):
            release.validate(self.root, 'modular-v1', 'different')

    def test_untagged_candidate_cannot_publish(self):
        self.record['cleanTaggedSource'] = False; self.save()
        with self.assertRaisesRegex(ValueError, 'clean tagged source'):
            release.validate(self.root, 'modular-v1', 'abc')

    def test_missing_corresponding_source_rejected(self):
        (self.root / 'native-source.tar.gz').unlink()
        with self.assertRaises(FileNotFoundError):
            release.validate(self.root, 'modular-v1', 'abc')

    def test_modified_package_rejected(self):
        (self.root / 'audio-flac.tgz').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError, 'asset changed'):
            release.validate(self.root, 'modular-v1', 'abc')

    def test_unqualified_core_rejected(self):
        name = 'qualification.json'
        q = json.loads((self.root / name).read_text()); q['ordinaryQualifiedAssembly'] = False
        self.put(name, json.dumps(q).encode()); self.save()
        with self.assertRaisesRegex(ValueError, 'ordinary qualified core'):
            release.validate(self.root, 'modular-v1', 'abc')

    def test_source_without_rebuild_cannot_release(self):
        name = 'qualification.json'
        q = json.loads((self.root / name).read_text()); q.pop('applicationSourceRebuild')
        self.put(name, json.dumps(q).encode()); self.save()
        with self.assertRaisesRegex(ValueError, 'extracted-source rebuild'):
            release.validate(self.root, 'modular-v1', 'abc')

    def test_stage_includes_all_packages_without_publishing(self):
        absent = release.urllib.error.HTTPError('https://registry.invalid', 404, 'absent', {}, None)
        with patch.object(release.urllib.request, 'urlopen', side_effect=absent), \
                patch.object(release.subprocess, 'run') as run:
            release.stage(self.root, 'modular-v1', 'abc')
        self.assertEqual(run.call_count, 12)
        for call in run.call_args_list:
            self.assertEqual(call.args[0][:3], ['npm', 'stage', 'publish'])
            self.assertIn('--provenance', call.args[0])

    def test_later_version_conflict_prevents_all_staging(self):
        absent = release.urllib.error.HTTPError('https://registry.invalid', 404, 'absent', {}, None)
        conflict = io.StringIO(json.dumps({'dist': {'integrity': 'different'}}))
        with patch.object(release.urllib.request, 'urlopen', side_effect=[absent, absent, conflict]), \
                patch.object(release.subprocess, 'run') as run:
            with self.assertRaisesRegex(ValueError, 'different bytes'):
                release.stage(self.root, 'modular-v1', 'abc')
            run.assert_not_called()


if __name__ == '__main__':
    unittest.main()
