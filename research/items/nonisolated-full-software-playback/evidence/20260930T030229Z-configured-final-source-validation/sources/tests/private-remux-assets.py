# SPDX-License-Identifier: Apache-2.0
import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('assets', pathlib.Path(__file__).resolve().parents[1] / 'scripts/private_remux_assets.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class PrivateAssets(unittest.TestCase):
    def test_complete_identity_and_hash_checked_bundle(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            for backend in ('jspi', 'asyncify'):
                for name, profile in (('remux', 'remux'), ('adaptation', 'transcode')):
                    folder = root / 'web' / f'engine-{name}-{backend}'
                    folder.mkdir(parents=True)
                    files = {}
                    for name in ('remux.mjs', 'remux.wasm'):
                        data = (profile + backend + name).encode()
                        (folder / name).write_bytes(data)
                        files[name] = hashlib.sha256(data).hexdigest()
                    (folder / 'manifest.json').write_text(json.dumps(dict(schema=1, backend=backend, profile=profile, files=files)))
            for name in ('private-remux.js', 'private-ffmpeg/bridge.js', 'private-ffmpeg/range-source.js', 'private-ffmpeg/single-owner.js', 'private-ffmpeg/LICENSE.txt'):
                file = root / 'web' / name
                file.parent.mkdir(exist_ok=True)
                file.write_text(name)
            collected = module.private_remux_assets(root)
            self.assertEqual(len(collected), 17)
            build = dict(clean=True, inputs={'source.c':'hash'}, configurations={'config.h':'hash'},
                         privateRemux={}, artifacts={})
            for name, data in collected.items():
                if name.endswith(('.wasm', '.mjs')):
                    folder = name.rsplit('/', 1)[0]
                    build['privateRemux'][folder] = dict(inputs=['source.c'], configurations=['config.h'])
                    build['artifacts'][name] = dict(sha256=hashlib.sha256(data).hexdigest())
            module.verify_private_release(collected, build)
            for key in ('inputs', 'configurations', 'artifacts', 'privateRemux'):
                broken = {**build, key:{}}
                with self.assertRaises(ValueError):
                    module.verify_private_release(collected, broken)
            with self.assertRaisesRegex(ValueError, 'clean engine'):
                module.verify_private_release(collected, {**build, 'clean':False})
            wasm = root / 'web/engine-remux-jspi/remux.wasm'
            original = wasm.read_bytes()
            wasm.write_bytes(b'wrong backend')
            with self.assertRaisesRegex(ValueError, 'artifact mismatch'):
                module.private_remux_assets(root)
            wasm.write_bytes(original)
            manifest = root / 'web/engine-remux-jspi/manifest.json'
            value = json.loads(manifest.read_text())
            value['backend'] = 'asyncify'
            manifest.write_text(json.dumps(value))
            with self.assertRaisesRegex(ValueError, 'identity mismatch'):
                module.private_remux_assets(root)
            manifest.unlink()
            with self.assertRaises(FileNotFoundError):
                module.private_remux_assets(root)

if __name__ == '__main__':
    unittest.main()
