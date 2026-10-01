#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
import importlib.util
import io
import gzip
import tarfile
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path
spec = importlib.util.spec_from_file_location('extract_ci', Path(__file__).resolve().parents[1] / 'scripts/extract-codec-expansion-ci.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Extraction(unittest.TestCase):
    def test_safe_and_malicious_archives(self):
        with tempfile.TemporaryDirectory() as folder:
            for index, name in enumerate(['codec-expansion-ci-inventory.json', '../escape', '/escape', 'blobs/../escape']):
                archive = Path(folder) / f'{index}.tgz'
                with tarfile.open(archive, 'w:gz') as stream:
                    info = tarfile.TarInfo(name)
                    info.size = 2
                    stream.addfile(info, io.BytesIO(b'{}'))
                out = Path(folder) / f'out-{index}'
                if index == 0:
                    module.extract(archive, out)
                    self.assertEqual((out / name).read_bytes(), b'{}')
                else:
                    with self.assertRaises(ValueError):
                        module.extract(archive, out)
                    self.assertFalse(out.exists())

    def test_total_budget_boundary(self):
        self.assertEqual(module.MAX_TOTAL_BYTES, 2 * 1024 * 1024 * 1024)
        with tempfile.TemporaryDirectory() as folder, patch.object(module, 'MAX_TOTAL_BYTES', 16):
            for size in [14, 15]:
                archive = Path(folder) / f'budget-{size}.tgz'
                with tarfile.open(archive, 'w:gz') as stream:
                    info = tarfile.TarInfo('codec-expansion-ci-inventory.json')
                    info.size = 2
                    stream.addfile(info, io.BytesIO(b'{}'))
                    info = tarfile.TarInfo('blobs/' + 'a' * 64)
                    info.size = size
                    stream.addfile(info, io.BytesIO(b'x' * size))
                out = Path(folder) / f'budget-{size}'
                if size == 14:
                    module.extract(archive, out)
                    self.assertEqual((out / 'blobs' / ('a' * 64)).read_bytes(), b'x' * size)
                else:
                    with self.assertRaisesRegex(ValueError, 'Input byte budget exceeded'):
                        module.extract(archive, out)
                    self.assertFalse(out.exists())

    def test_links_and_duplicate_members(self):
        with tempfile.TemporaryDirectory() as folder:
            for kind in ['link', 'duplicate']:
                archive = Path(folder) / f'{kind}.tgz'
                with tarfile.open(archive, 'w:gz') as stream:
                    info = tarfile.TarInfo('codec-expansion-ci-inventory.json')
                    if kind == 'link':
                        info.type = tarfile.SYMTYPE
                        info.linkname = '/etc/passwd'
                        stream.addfile(info)
                    else:
                        stream.addfile(info, io.BytesIO())
                        stream.addfile(info, io.BytesIO())
                with self.assertRaises(ValueError):
                    module.extract(archive, Path(folder) / kind)

    def test_metadata_headers_are_bounded_before_tar_parser(self):
        for kind in (tarfile.XHDTYPE, tarfile.XGLTYPE, tarfile.GNUTYPE_LONGNAME, tarfile.GNUTYPE_LONGLINK):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                info = tarfile.TarInfo('metadata')
                info.type, info.size = kind, 65537
                archive = root/'bomb.tgz'
                with gzip.open(archive, 'wb') as stream:
                    stream.write(info.tobuf())
                    stream.write(b'\0'*66048)
                    stream.write(b'\0'*1024)
                with self.assertRaisesRegex(ValueError, 'Metadata budget'):
                    module.extract(archive, root/'out')
                self.assertFalse((root/'out').exists())

    def test_expanded_padding_bomb_and_normal_pax(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive = root/'bomb.tgz'
            with gzip.open(archive, 'wb') as stream:
                stream.write(b'\0'*(2*1024*1024))
            with patch.object(module, 'MAX_TOTAL_BYTES', 1024), patch.object(module, 'MAX_TAR_OVERHEAD_BYTES', 1024):
                with self.assertRaisesRegex(ValueError, 'Expanded tar budget'):
                    module.extract(archive, root/'out')
            self.assertFalse((root/'out').exists())
            archive = root/'pax.tgz'
            with tarfile.open(archive, 'w:gz', format=tarfile.PAX_FORMAT) as stream:
                info = tarfile.TarInfo('codec-expansion-ci-inventory.json')
                info.size, info.mtime = 2, 1234.5
                stream.addfile(info, io.BytesIO(b'{}'))
            module.extract(archive, root/'pax-out')
            self.assertEqual((root/'pax-out/codec-expansion-ci-inventory.json').read_bytes(), b'{}')


if __name__ == '__main__':
    unittest.main()
