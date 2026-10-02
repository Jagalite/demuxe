#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Validate release recipe/ABI boundaries without compiling native engines."""
import ast
import importlib.util
import json
import subprocess
import tempfile
from types import SimpleNamespace
from unittest import mock
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('installer', ROOT / 'scripts/install-private-playback.py')
installer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(installer)


def audit(lease=False, diagnostic=False):
    return {'imports': [{'module': 'demuxe_decoder', 'name': 'demuxe_decoder_release_v1', 'kind': 'function'}] if lease else [],
            'exports': [{'name': 'demuxe_test_lease_begin', 'kind': 'function'}] if diagnostic else []}


class ReleaseContract(unittest.TestCase):
    def test_maintained_release_enables_versioned_lease_without_test_exports(self):
        tree = ast.parse((ROOT / 'scripts/build-private-release.py').read_text())
        calls = [node for node in ast.walk(tree) if isinstance(node, ast.Call)
                 and any(isinstance(item, ast.Constant) and item.value == 'mpv/scripts/link-playback.py' for arg in node.args for item in ast.walk(arg))]
        self.assertEqual(len(calls), 1)
        args = [arg.value for arg in calls[0].args if isinstance(arg, ast.Constant)]
        self.assertIn('--hybrid', args)
        self.assertIn('--retained-lease', args)
        self.assertNotIn('--retained-lease-tests', args)

    def test_legacy_builds_retain_their_existing_abi(self):
        self.assertEqual(installer.retained_lease_version({}), 0)
        installer.verify_retained_lease_abi({}, audit())

    def test_production_lease_requires_the_real_native_import(self):
        installer.verify_retained_lease_abi({'retainedLeaseVersion': 1}, audit(True))
        with self.assertRaisesRegex(ValueError, 'disagree'):
            installer.verify_retained_lease_abi({'retainedLeaseVersion': 1}, audit())
        with self.assertRaisesRegex(ValueError, 'disagree'):
            installer.verify_retained_lease_abi({}, audit(True))

    def test_diagnostic_flag_is_rejected_before_installation(self):
        with self.assertRaisesRegex(ValueError, 'Diagnostic'):
            installer.retained_lease_version({'retainedLeaseVersion': 1, 'retainedLeaseTests': True})

    def test_diagnostic_export_is_rejected_even_with_a_forged_flag(self):
        with self.assertRaisesRegex(ValueError, 'Diagnostic'):
            installer.verify_retained_lease_abi({'retainedLeaseVersion': 1, 'retainedLeaseTests': False}, audit(True, True))

    def test_installed_versioned_manifests_are_accepted_by_the_actual_loader(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            build, deps, runtime = root / 'build', root / 'deps', root / 'runtime'
            build.mkdir()
            (deps / 'objects/ffmpeg').mkdir(parents=True)
            (deps / 'objects/ffmpeg/config_components.h').write_text('#define CONFIG_H264_DECODER 1\n')
            (deps / 'build-result.json').write_text(json.dumps({'profile': 'playback-full', 'toolchain': {'sdk': str(root / 'sdk')}, 'commands': []}))
            names = ['playback.mjs', 'playback.wasm', 'playback.asyncify.wasm']
            for name in names:
                (build / name).write_bytes(name.encode())
            record = {'status': 'built_candidate_only', 'dependencyProfile': 'playback-full',
                      'dependencyPath': str(deps), 'dependencyRecordSHA256': installer.digest(deps / 'build-result.json'),
                      'adaptedSourceSHA256': {}, 'artifacts': {name: installer.digest(build / name) for name in names},
                      'retainedDecoder': True, 'retainedLeaseVersion': 1}
            (build / 'build.json').write_text(json.dumps(record))
            verifier = SimpleNamespace(verify_dependencies=lambda *_: None)
            fake_spec = SimpleNamespace(loader=SimpleNamespace(exec_module=lambda _: None))
            with mock.patch.object(installer.importlib.util, 'spec_from_file_location', return_value=fake_spec), \
                 mock.patch.object(installer.importlib.util, 'module_from_spec', return_value=verifier), \
                 mock.patch.object(installer.subprocess, 'run', return_value=SimpleNamespace(stdout=json.dumps(audit(True)).encode())):
                installer.install(build, runtime)
            # Execute the maintained consumer, not a second feature allowlist.
            script = """
                import assert from 'node:assert/strict';
                import fs from 'node:fs';
                const {privatePlaybackAssets}=await import(process.argv[1]);
                for(const backend of ['jspi','asyncify']){
                  const value=JSON.parse(fs.readFileSync(`${process.argv[2]}/web/engine-mpv-playback-${backend}/manifest.json`));
                  assert.equal(value.retainedLeaseVersion,1);
                  assert.ok(privatePlaybackAssets(value,backend));
                  assert.equal(privatePlaybackAssets({...value,features:[...value.features,'retained-frame-release-v1']},backend),undefined);
                }
            """
            subprocess.run(['node', '--input-type=module', '-e', script,
                            (ROOT / 'web/generated/internal/private-playback-admission.js').as_uri(), str(runtime)], check=True)

    def test_unknown_or_noninteger_version_is_rejected(self):
        for version in [True, '1', 1.0, 2, -1, None]:
            with self.subTest(version=version), self.assertRaisesRegex(ValueError, 'version'):
                installer.retained_lease_version({'retainedLeaseVersion': version})


if __name__ == '__main__':
    unittest.main()
