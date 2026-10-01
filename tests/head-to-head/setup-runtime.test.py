# SPDX-License-Identifier: Apache-2.0
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('fixture_setup', Path(__file__).with_name('setup.py'))
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)

class RuntimeSnapshot(unittest.TestCase):
    def fixture(self, root):
        # A complete synthetic installed set; native bytes are bound by real manifest hashes.
        for backend in ['jspi', 'asyncify']:
            for family, profile, stem in [('remux','remux','remux'), ('adaptation','transcode','remux'),
                                           ('mpv-playback','playback','player'), ('mpv-audio','audio','service'),
                                           ('mpv-subtitles','subtitles','service')]:
                folder = root / 'web' / ('engine-' + family + '-' + backend)
                folder.mkdir(parents=True)
                files = {}
                for suffix in ['mjs','wasm']:
                    data = (family + backend + suffix).encode()
                    name = stem + '.' + suffix
                    (folder / name).write_bytes(data)
                    files[name] = hashlib.sha256(data).hexdigest()
                (folder / 'manifest.json').write_text(json.dumps({'schema':1,'backend':backend,'profile':profile,'audioCapacity':8192,'files':files}))
        names = ['private-mpv.js','private-mpv/LICENSE.txt','private-mpv/engine.js','private-mpv/scheduler.js',
                 'private-mpv/continuations.js','private-mpv/range-source.js','private-mpv/audio-worklet.js',
                 'private-mpv/decoder-mailbox.js','private-mpv/retained-decoder.js','private-mpv/audio-worker.js',
                 'private-mpv/playback-worker.js','private-mpv/playback-host.js','private-mpv/playback-pcm.js',
                 'private-mpv/retained-presentation.js','external-video-decoder.js','video-codec-config.js',
                 'retained-video.js','subtitle-overlay.js','private-remux.js','private-ffmpeg/bridge.js',
                 'private-ffmpeg/range-source.js','private-ffmpeg/single-owner.js','private-ffmpeg/LICENSE.txt']
        for name in names:
            p = root / 'web' / name
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(name)
        extra = root / 'web/private-mpv/additional-dependency.js'
        extra.write_text('owned dependency')
        return extra

    def test_complete_services_playback_and_deep_dependencies_are_frozen(self):
        with tempfile.TemporaryDirectory() as home:
            root=Path(home);extra=self.fixture(root)
            paths, engines, private=setup.player_runtime_snapshot(root)
            self.assertIn(extra, paths)
            self.assertIn(root/'web/private-mpv/audio-worker.js', paths)
            self.assertIn(root/'web/private-mpv/playback-worker.js', paths)
            self.assertEqual(sum(name.endswith('manifest.json') for name in private),10)
            self.assertTrue(engines['engine-mpv-playback-jspi'])
            self.assertTrue(engines['engine-adaptation-asyncify'])
            for name, data in private.items():
                self.assertEqual(setup.sha(root/name), hashlib.sha256(data).hexdigest())

    def test_corrupt_native_and_missing_required_runtime_are_rejected(self):
        with tempfile.TemporaryDirectory() as home:
            root=Path(home);self.fixture(root)
            p=root/'web/engine-mpv-playback-jspi/player.wasm';original=p.read_bytes();p.write_bytes(original+b'corruption')
            with self.assertRaisesRegex(ValueError,'artifact mismatch'):
                setup.player_runtime_snapshot(root)
            p.write_bytes(original);(root/'web/private-mpv/playback-worker.js').unlink()
            with self.assertRaises(FileNotFoundError):
                setup.player_runtime_snapshot(root)

    def test_absent_optional_private_install_preserves_legacy_setup(self):
        with tempfile.TemporaryDirectory() as home:
            paths, engines, private=setup.player_runtime_snapshot(Path(home))
            self.assertEqual(paths,[]);self.assertEqual(private,{})
            self.assertFalse(any(engines.values()))

if __name__=='__main__':unittest.main()
