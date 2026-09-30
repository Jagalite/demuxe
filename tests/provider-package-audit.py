#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Archive-boundary regressions; no engine build required."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('provider_audit', ROOT / 'scripts/audit-provider-package.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
spec = importlib.util.spec_from_file_location('provider_pack', ROOT / 'scripts/package-provider.py')
provider_pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(provider_pack)


def fixture():
    template = json.loads((ROOT / 'packages/player-core/package.json').read_text())
    template.pop('private')
    template.pop('scripts')
    files = {'LICENSE': (ROOT / 'LICENSES/Apache-2.0.txt').read_bytes(),
             'package.json': json.dumps(template).encode(),
             'dist/index.js': b'export {};\n', 'dist/index.d.ts': b'export {};\n'}
    for entry in template['exports'].values():
        for target in entry.values():
            files.setdefault(target[2:], b'export {};\n')
    files['license-map.json'] = json.dumps({name: ['Apache-2.0'] for name in [*files, 'license-map.json']}).encode()
    inputs = {'LICENSE': ('notice', 'LICENSES/Apache-2.0.txt'),
              'package.json': ('metadata', 'packages/player-core/package.json'),
              'license-map.json': ('metadata', 'licensing/provider-packages.json'),
              'dist/index.js': ('code', 'src/internal/selection.ts'),
              'dist/index.d.ts': ('code', 'src/internal/selection.ts')}
    for name in files:
        inputs.setdefault(name, ('code', 'src/internal/selection.ts'))
    record = {'schema': 1, 'target': 'core', 'sources': {}, 'files': {}}
    for name, data in files.items():
        kind, source = inputs[name]
        record['sources'][source] = {'sha256': audit.sha((ROOT / source).read_bytes())}
        record['files'][name] = {'sha256': audit.sha(data), 'kind': kind, 'inputs': [source], 'licenses': ['Apache-2.0']}
    return files, record


class ProviderPackageAudit(unittest.TestCase):
    def test_exact_inventory_boundary(self):
        # Inventory trust is external: this checks packaging, not compilation.
        audit.audit('core', *fixture())

    def test_permissive_provider_code_cannot_enter_core_under_a_new_filename(self):
        for source in ['src/internal/wasm-player.ts', 'web/private-remux.js', 'native/subtitles/service.c']:
            with self.subTest(source=source):
                files, record = fixture()
                record['files']['dist/index.js']['inputs'] = [source]
                record['sources'][source] = {'sha256': audit.sha((ROOT / source).read_bytes())}
                with self.assertRaisesRegex(ValueError, 'Provider-owned'):
                    audit.audit('core', files, record)

    def test_unlisted_binary_and_changed_generated_bytes_fail(self):
        files, record = fixture()
        with self.assertRaisesRegex(ValueError, 'file set'):
            audit.audit('core', {**files, 'runtime/engine.wasm': b'wasm'}, record)
        files['dist/index.js'] += b'/* changed */'
        with self.assertRaisesRegex(ValueError, 'hash mismatch'):
            audit.audit('core', files, record)

    def test_source_map_is_rejected_even_if_inventory_lists_it(self):
        files, record = fixture()
        files['dist/index.js.map'] = b'{}'
        record['files']['dist/index.js.map'] = copy.deepcopy(record['files']['dist/index.js'])
        record['files']['dist/index.js.map']['sha256'] = audit.sha(b'{}')
        licenses = json.loads(files['license-map.json'])
        licenses['dist/index.js.map'] = ['Apache-2.0']
        files['license-map.json'] = json.dumps(licenses).encode()
        record['files']['license-map.json']['sha256'] = audit.sha(files['license-map.json'])
        with self.assertRaisesRegex(ValueError, 'source maps'):
            audit.audit('core', files, record)

    def test_notice_bytes_cannot_be_relicensed_by_inventory(self):
        files, record = fixture()
        files['LICENSE'] += b'changed'
        record['files']['LICENSE']['sha256'] = audit.sha(files['LICENSE'])
        with self.assertRaisesRegex(ValueError, 'retained license'):
            audit.audit('core', files, record)

    def test_assembly_is_exact_and_never_overwrites_an_archive(self):
        files, record = fixture()
        with tempfile.TemporaryDirectory() as directory:
            payload = Path(directory).resolve() / 'payload'
            payload.mkdir()
            for name, data in files.items():
                path = payload / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
            # Unlisted staging files cannot silently enter the tarball.
            (payload / 'unlisted.wasm').write_bytes(b'not part of the package')
            output = Path(directory) / 'checked.tgz'
            provider_pack.assemble('core', payload, record, output)
            self.assertEqual(audit.archive_files(output), files)
            before = output.read_bytes()
            with self.assertRaises(FileExistsError):
                provider_pack.assemble('core', payload, record, output)
            self.assertEqual(output.read_bytes(), before)

    def test_assembly_rejects_missing_material_before_writing_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            payload = Path(directory).resolve() / 'payload'
            payload.mkdir()
            output = Path(directory) / 'provider.tgz'
            with self.assertRaisesRegex(ValueError, 'Missing'):
                provider_pack.assemble('ffmpeg', payload, {'files': {'missing.wasm': {}}}, output)
            self.assertFalse(output.exists())
            with self.assertRaisesRegex(ValueError, 'Required package'):
                provider_pack.assemble('ffmpeg', payload, {'schema': 1, 'target': 'ffmpeg', 'files': {}}, output)
            self.assertFalse(output.exists())

    def test_assembly_rejects_symlinked_and_traversal_payloads(self):
        with tempfile.TemporaryDirectory() as directory:
            payload = Path(directory).resolve() / 'payload'
            payload.mkdir()
            (payload / 'linked').symlink_to(ROOT / 'package.json')
            output = Path(directory) / 'provider.tgz'
            for name in ['linked', '../package.json']:
                with self.subTest(name=name), self.assertRaises(ValueError):
                    provider_pack.assemble('mpv', payload, {'files': {name: {}}}, output)
            self.assertFalse(output.exists())

    def test_archive_paths_links_and_duplicates(self):
        for names, link in [(['package/../outside'], False), (['package/file'], True), (['package/file', 'package/file'], False)]:
            with self.subTest(names=names, link=link), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / 'bad.tgz'
                with tarfile.open(path, 'w:gz') as archive:
                    for name in names:
                        entry = tarfile.TarInfo(name)
                        if link:
                            entry.type = tarfile.SYMTYPE
                            entry.linkname = '/outside'
                            archive.addfile(entry)
                        else:
                            entry.size = 1
                            archive.addfile(entry, io.BytesIO(b'x'))
                with self.assertRaises(ValueError):
                    audit.archive_files(path)


if __name__ == '__main__':
    unittest.main()
