#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exercise source/package violations without modifying the working checkout."""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from license_policy import Policy, APACHE, GPL, LGPL, LEGAL, encoded, archive_files, sha


class LicenseBoundaries(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.policy = Policy(ROOT)
        cls.directory = tempfile.TemporaryDirectory()
        cls.out = pathlib.Path(cls.directory.name)
        subprocess.run(['python3', 'scripts/package-core.py', '--output', str(cls.out)], cwd=ROOT, check=True)
        cls.archive = next(cls.out.glob('*.tgz'))
        cls.core = archive_files(cls.archive)

    @classmethod
    def tearDownClass(cls):
        cls.directory.cleanup()

    def fixture(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = pathlib.Path(temporary.name)
        names = (self.policy.core_files() | set(LEGAL) | set(self.policy.config['preservedFiles']) |
                 {'packages/core/package.json', 'packages/core/LICENSE', 'package.json', 'package-lock.json',
                  'scripts/check-core-boundary.mjs', '.gitignore', 'src/unified-player.ts'})
        for name in names:
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / name, target)
        (root / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
        subprocess.run(['git', 'init', '-q', str(root)], check=True)
        subprocess.run(['git', 'add', '-A'], cwd=root, check=True)
        return root

    def test_real_core_archive(self):
        self.policy.check_package(self.core, 'core')
        self.assertFalse(any(n.endswith('.wasm') or 'worker' in n or n.startswith('third_party/') for n in self.core))

    def test_actual_core_consumer(self):
        consumer = self.out / 'consumer'
        package = consumer / 'node_modules/demuxe-core'
        for name, data in self.core.items():
            target = package / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        script = consumer / 'check.mjs'
        script.write_text("import assert from 'node:assert/strict';\n"
                          "import * as core from 'demuxe-core';\n"
                          "import {RangeReader} from 'demuxe-core/range-reader';\n"
                          "import {cheapMP4Probe} from 'demuxe-core/mp4-probe';\n"
                          "assert.equal(typeof core.planAdmission, 'function');\n"
                          "assert.equal(typeof core.RuntimeCapabilities, 'function');\n"
                          "assert.equal(typeof RangeReader, 'function');\n"
                          "assert.equal(typeof cheapMP4Probe, 'function');\n"
                          "assert.equal(core.Player, undefined);\n")
        subprocess.run(['node', str(script)], check=True)
        types = consumer / 'check.mts'
        types.write_text("import {RuntimeCapabilities, type PlanFacts} from 'demuxe-core';\n"
                         "const cache = new RuntimeCapabilities(); cache.clear();\n")
        subprocess.run([str(ROOT / 'node_modules/.bin/tsc'), '--noEmit', '--strict', '--target', 'ES2022',
                        '--module', 'NodeNext', '--moduleResolution', 'NodeNext', str(types)], check=True)

    def test_package_rejects_extra_player_even_with_consistent_map(self):
        files = dict(self.core)
        files['web/engine-hybrid/player.wasm'] = b'not a real engine'
        files['license-map.json'] = encoded(self.policy.package_map(files, 'core'))
        with self.assertRaisesRegex(ValueError, 'Non-core content'):
            self.policy.check_package(files, 'core')

    def test_package_rejects_metadata_and_license_removal(self):
        for name in ['LICENSES/Apache-2.0.txt', 'LICENSES/GPL-2.0-or-later.txt', 'LICENSES/GPL-3.0-or-later.txt', 'LICENSES/LGPL-2.1-or-later.txt', 'LICENSES/CC-BY-4.0.txt']:
            files = dict(self.core)
            del files[name]
            with self.assertRaisesRegex(ValueError, 'Missing packaged license'):
                self.policy.check_package(files, 'core')
        files = dict(self.core)
        metadata = json.loads(files['package.json'])
        metadata['license'] = '(Apache-2.0 OR GPL-2.0-or-later)'
        files['package.json'] = encoded(metadata)
        with self.assertRaisesRegex(ValueError, 'Incorrect package license'):
            self.policy.check_package(files, 'core')

    def test_package_rejects_runtime_dependency(self):
        files = dict(self.core)
        metadata = json.loads(files['package.json'])
        metadata['dependencies'] = {'demuxe': '*'}
        files['package.json'] = encoded(metadata)
        files['license-map.json'] = encoded(self.policy.package_map(files, 'core'))
        with self.assertRaisesRegex(ValueError, 'runtime dependencies'):
            self.policy.check_package(files, 'core')

    def test_package_rejects_changed_module_even_with_rehashed_map(self):
        files = dict(self.core)
        files['web/generated/core.js'] += b"export * from './index.js';\n"
        files['license-map.json'] = encoded(self.policy.package_map(files, 'core'))
        with self.assertRaisesRegex(ValueError, 'differs from source'):
            self.policy.check_package(files, 'core')

    def test_ast_rejects_static_dynamic_type_and_worker_crossings(self):
        root = self.fixture()
        source = root / 'src/core.ts'
        original = source.read_text()
        mutations = ["export * from './unified-player.js';", "import('./unified-player.js');",
                     "import(userSelectedModule);", "type Bad = import('./unified-player.js').Player;",
                     "new Worker('/web/engine-worker.js');", "import 'demuxe';"]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                source.write_text(original + '\n' + mutation + '\n')
                result = subprocess.run(['node', 'scripts/check-core-boundary.mjs'], cwd=root, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('core', result.stderr.lower())

    def test_missing_header_and_preserved_notice_mutation(self):
        root = self.fixture()
        policy = Policy(root)
        policy.check()
        source = root / 'web/range-reader.js'
        original = source.read_bytes()
        source.write_bytes(original.replace(('// SPDX-License-Identifier: ' + APACHE + '\n').encode(), b''))
        with self.assertRaisesRegex(ValueError, 'SPDX header: web/range-reader.js'):
            policy.check()
        source.write_bytes(original)
        (root / 'third_party/notices/mpv/LICENSE.GPL').write_text('changed')
        with self.assertRaisesRegex(ValueError, 'Preserved source/notice changed'):
            policy.check()

    def test_unknown_files_require_classification(self):
        with self.assertRaisesRegex(ValueError, 'Unclassified path'):
            self.policy.classify('new-package/player.js')

    def test_source_companion_without_git_remains_checkable(self):
        root = self.fixture()
        shutil.rmtree(root / '.git')
        (root / 'build').mkdir()
        (root / 'build/unrelated-output').write_text('generated build output')
        policy = Policy(root)
        policy.check()
        self.assertIn('src/core.ts', policy.paths())
        self.assertNotIn('build/unrelated-output', policy.paths())

    def test_reports_tools_and_media_stay_distinct(self):
        for name, expected in [('results/example.json', 'CC-BY-4.0'),
                               ('experiments/example/report.md', 'CC-BY-4.0'),
                               ('experiments/example/measure.mjs', APACHE),
                               ('native/remux/remux.c', APACHE),
                               ('native/vd_browser.c', LGPL),
                               ('web/source-probe.js', APACHE),
                               ('results/example/worker.js', 'GPL-2.0-or-later'),
                               ('results/example/frame.png', 'NOASSERTION'),
                               ('experiments/example/files/native.c', 'NOASSERTION')]:
            self.assertEqual(self.policy.classify(name), expected)

    def test_player_package_requires_notices_and_verified_lgpl_metadata(self):
        files = {name: (ROOT / name).read_bytes() for name in LEGAL + ['README.md', 'docs/LGPL-RELINK.md', 'fixtures/FONT-LICENSE.txt', 'fixtures/DejaVuSans.ttf']}
        for path in (ROOT / 'third_party').rglob('*'):
            if path.is_file():
                files[str(path.relative_to(ROOT))] = path.read_bytes()
        files['package.json'] = encoded({'license': APACHE, 'demuxeLicenses': self.policy.config['packageLicenses']})
        name = 'web/engine-hybrid/player.wasm'
        engine_names = [f'web/{folder}/{stem}.{ext}'
                        for folder, stem in [('engine-hybrid', 'player'),
                                             ('engine-software-full', 'player'),
                                             ('engine-software-yuv', 'player'),
                                             ('engine-remux', 'remux'),
                                             ('engine-subtitles', 'service')]
                        for ext in ['mjs', 'wasm']]
        for engine_name in engine_names:
            files[engine_name] = b'synthetic LGPL engine fixture'
        record = {'baseline': LGPL, 'hybrid': LGPL, 'software': LGPL, 'subtitles': LGPL,
                  'remuxWrapper': APACHE, 'remuxFFmpegLibrary': LGPL,
                  'baselineFFmpeg': 'LGPL version 2.1 or later',
                  'fullFFmpeg': 'LGPL version 2.1 or later',
                  'remuxFFmpeg': 'LGPL version 2.1 or later', 'mpvGPL': False}
        build = {'licenses': record, 'licensingEvidence': {'status': 'verified', 'mpv': {'gpl': False}},
                 'artifacts': {engine_name: {'sha256': sha(files[engine_name])}
                               for engine_name in engine_names}}
        files['engine-build.json'] = encoded(build)
        files['license-map.json'] = encoded(self.policy.package_map(files, 'player'))
        self.policy.check_package(files, 'player')
        stale = dict(files)
        stale['package.json'] = encoded({'license': GPL, 'demuxeLicenses': self.policy.config['packageLicenses']})
        with self.assertRaisesRegex(ValueError, 'Incorrect package license'):
            self.policy.check_package(stale, 'player')
        for key, value, error in [('hybrid', GPL, 'Combined engine license'),
                                  ('remuxFFmpegLibrary', GPL, 'Combined engine license'),
                                  ('mpvGPL', True, 'LGPL mpv build evidence')]:
            stale = dict(files)
            stale['engine-build.json'] = encoded({**build, 'licenses': {**record, key: value}})
            stale['license-map.json'] = encoded(self.policy.package_map(stale, 'player'))
            with self.assertRaisesRegex(ValueError, error):
                self.policy.check_package(stale, 'player')
        stale = dict(files)
        stale[name] = b'changed old engine'
        stale['license-map.json'] = encoded(self.policy.package_map(stale, 'player'))
        with self.assertRaisesRegex(ValueError, 'Engine artifact differs'):
            self.policy.check_package(stale, 'player')
        del files['third_party/notices/mpv/LICENSE.GPL']
        files['license-map.json'] = encoded(self.policy.package_map(files, 'player'))
        with self.assertRaisesRegex(ValueError, 'packaged third-party notice'):
            self.policy.check_package(files, 'player')

    def test_player_assembler_rejects_synthetic_engines_without_build_record(self):
        # Stub engine bytes cannot acquire an Apache archive label.
        root = self.fixture()
        for folder in ['web', 'src', 'docs', 'bin', 'fixtures', 'scripts', 'examples', 'third_party']:
            shutil.copytree(ROOT / folder, root / folder, dirs_exist_ok=True,
                            ignore=lambda folder,names:[n for n in names if n=='__pycache__' or (n.startswith('engine-') and (pathlib.Path(folder)/n).is_dir())])
        for folder, stem in [('engine-remux', 'remux'), ('engine-hybrid', 'player'), ('engine-software-full', 'player'), ('engine-software-yuv', 'player'), ('engine-subtitles', 'service')]:
            for extension in ['mjs', 'wasm']:
                file = root / 'web' / folder / (stem + '.' + extension)
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(b'SYNTHETIC PACKAGING TEST ONLY\n')
        for name in ['sources.lock.json', 'toolchain.lock.json', 'README.md']:
            shutil.copy2(ROOT / name, root / name)
        subprocess.run(['git', '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
                        'commit', '--allow-empty', '-qm', 'synthetic fixture'], cwd=root, check=True)
        result = subprocess.run(['python3', 'scripts/package-beta.py'], cwd=root, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('completed LGPL engine build record', result.stderr)


if __name__ == '__main__':
    unittest.main()
