#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Exercise Pages assembly and tag guards with a tiny synthetic runtime archive.

This checks the assembler; it does not qualify engine compilation or playback.
"""
import hashlib
import json
import pathlib
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class PagesBuild(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='demuxe-pages-build-')
        self.root = pathlib.Path(self.temp.name)
        def put(name, text):
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text)
        put('.gitignore', '/build/\n__pycache__/\n')
        put('scripts/build-pages.py', (ROOT / 'scripts/build-pages.py').read_text())
        # Only package production is stubbed: inspect the real assembler's output.
        put('scripts/package-beta.py', '''import argparse,io,tarfile,pathlib
p=argparse.ArgumentParser();p.add_argument('--output');a=p.parse_args()
out=pathlib.Path(a.output);out.mkdir(parents=True)
with tarfile.open(out/'test.tgz','w:gz') as t:
 for name in ['fixtures/example.mp4','web/generated/player/index.js']:
  b=b'test-runtime';i=tarfile.TarInfo('package/'+name);i.size=len(b);t.addfile(i,io.BytesIO(b))
''')
        put('scripts/shaka_source.py', '''def pages_source(root):
 p=root/'build/shaka-source.tar.gz';p.write_bytes(b'test-source');return p
''')
        for name in ['web/player.css', 'web/player-demo.js', 'web/player-geometry.js',
                     'fixtures/example.mp4', 'fixtures/DejaVuSans.ttf', 'fixtures/FONT-LICENSE.txt',
                     'sdk/upstream/emscripten/runtime.js', 'experiments/required.py',
                     'experiments/evidence/not-source.txt', 'research/large-report.txt']:
            put(name, 'fixture')
        put('web/player.html', (ROOT / 'web/player.html').read_text())
        for name in ['pages-boot.js', 'pages-isolation-sw.js']:
            put('hosting/'+name, (ROOT / 'hosting' / name).read_text())
        put('sources.lock.json', '{"sources":[]}')
        put('build/beta-build-start.json', '{}')
        put('build/beta-build.json', json.dumps({'clean': True, 'sdk': str(self.root/'sdk'),
                                              'inputs': {'experiments/required.py': 'fixture'}, 'configurations': {}}))
        self.git('init', '-q')
        self.git('add', '.')
        self.git('-c', 'user.name=Pages test', '-c', 'user.email=pages@example.invalid', 'commit', '-qm', 'Fixture')
        self.git('tag', 'v-test')

    def tearDown(self):
        self.temp.cleanup()

    def git(self, *args):
        return subprocess.check_output(['git', *args], cwd=self.root, text=True).strip()

    def build(self, *args):
        return subprocess.run(['python3', 'scripts/build-pages.py', *args], cwd=self.root, text=True, capture_output=True)

    def test_tagged_source_and_page(self):
        run = self.build('--tag', 'v-test')
        self.assertEqual(run.returncode, 0, run.stdout+run.stderr)
        out = self.root/'build/pages-site'
        page = (out/'index.html').read_text()
        self.assertIn('layout="classic"', page)
        self.assertNotIn('prepare="all"', page)
        self.assertIn('<main inert>', page)
        self.assertIn('./pages-boot.js', page)
        self.assertNotIn('src="/web/', page)
        self.assertIn('/tree/'+self.git('rev-parse', 'HEAD'), page)
        manifest = json.loads((out/'deployment-manifest.json').read_text())
        self.assertEqual(manifest['sourceTag'], 'v-test')
        self.assertEqual(manifest['status'], 'tagged-development-demo')
        self.assertFalse(manifest['dirtySource'])
        for name, identity in manifest['files'].items():
            self.assertEqual(identity['sha256'], hashlib.sha256((out/name).read_bytes()).hexdigest())
        import tarfile
        with tarfile.open(out/'source/demuxe-source.tar.gz') as archive:
            names = archive.getnames()
        self.assertIn('demuxe/experiments/required.py', names)
        self.assertNotIn('demuxe/experiments/evidence/not-source.txt', names)
        self.assertNotIn('demuxe/research/large-report.txt', names)
        self.assertNotEqual(self.build('--tag', 'v-test').returncode, 0, 'Never overwrite an existing site')

    def test_tag_guards(self):
        self.assertNotEqual(self.build('--tag', 'absent').returncode, 0)
        (self.root/'web/player.css').write_text('changed')
        self.assertIn('clean source checkout', self.build('--tag', 'v-test').stderr)

    def test_preview_is_explicitly_unqualified(self):
        run = self.build('--preview')
        self.assertEqual(run.returncode, 0, run.stdout+run.stderr)
        manifest = json.loads((self.root/'build/pages-site/deployment-manifest.json').read_text())
        self.assertEqual(manifest['status'], 'local-preview-not-for-deployment')
        self.assertFalse(manifest['independentCleanBuildQualified'])
        self.assertNotEqual(self.build('--tag', 'v-test', '--preview', '--output', 'build/other').returncode, 0)


if __name__ == '__main__':
    unittest.main()
