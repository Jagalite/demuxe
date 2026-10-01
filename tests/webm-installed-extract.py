# SPDX-License-Identifier: Apache-2.0
import importlib.util
import io
import gzip
import tarfile
import tempfile
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('extract_webm', Path(__file__).resolve().parents[1]/'scripts/extract-webm-installed-inputs.py')
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)


class ExtractionContracts(unittest.TestCase):
    def archive(self, root, entries):
        path = root/'inputs.tar.gz'
        with tarfile.open(path, 'w:gz') as tar:
            for name, kind in entries:
                entry = tarfile.TarInfo(name)
                if kind == 'link':
                    entry.type = tarfile.SYMTYPE
                    entry.linkname = '/etc/passwd'
                    tar.addfile(entry)
                else:
                    data = b'{}'
                    entry.size = len(data)
                    tar.addfile(entry, io.BytesIO(data))
        return path

    def test_accept_canonical_and_require_fresh_destination(self):
        with tempfile.TemporaryDirectory() as home:
            root = Path(home)
            archive = self.archive(root, [('webm-installed-input-inventory.json', 'file'), ('blobs/'+'a'*64, 'file')])
            extractor.extract(archive, root/'out')
            self.assertTrue((root/'out/webm-installed-input-inventory.json').is_file())
            with self.assertRaises(ValueError):
                extractor.extract(archive, root/'out')

    def test_reject_traversal_links_duplicates_and_missing_inventory(self):
        for entries in [[('../escape', 'file')], [('blobs/'+'a'*64, 'link')], [('webm-installed-input-inventory.json', 'file')]*2, [('blobs/'+'a'*64, 'file')]]:
            with self.subTest(entries=entries), tempfile.TemporaryDirectory() as home:
                root = Path(home)
                with self.assertRaises(ValueError):
                    extractor.extract(self.archive(root, entries), root/'out')
                self.assertFalse((root/'out').exists())

    def test_extension_and_expanded_bombs_reject_before_parser_or_writes(self):
        for kind in (tarfile.XHDTYPE, tarfile.XGLTYPE, tarfile.GNUTYPE_LONGNAME, tarfile.GNUTYPE_LONGLINK):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as home:
                root = Path(home)
                entry = tarfile.TarInfo('metadata')
                entry.type, entry.size = kind, 65537
                archive = root/'bomb.tar.gz'
                with gzip.open(archive, 'wb') as stream:
                    stream.write(entry.tobuf())
                    stream.write(b'\0'*66048)
                    stream.write(b'\0'*1024)
                with self.assertRaisesRegex(ValueError, 'Metadata budget'):
                    extractor.extract(archive, root/'out')
                self.assertFalse((root/'out').exists())
        with tempfile.TemporaryDirectory() as home:
            root = Path(home)
            archive = root/'expanded.tar.gz'
            with gzip.open(archive, 'wb') as stream:
                for _ in range(137):
                    stream.write(b'\0'*(1024*1024))
            with self.assertRaisesRegex(ValueError, 'Expanded tar budget'):
                extractor.extract(archive, root/'out')
            self.assertFalse((root/'out').exists())

    def test_normal_pax_mtime_is_accepted(self):
        with tempfile.TemporaryDirectory() as home:
            root = Path(home)
            archive = root/'pax.tar.gz'
            with tarfile.open(archive, 'w:gz', format=tarfile.PAX_FORMAT) as tar:
                entry = tarfile.TarInfo('webm-installed-input-inventory.json')
                entry.size, entry.mtime = 2, 1234.5
                tar.addfile(entry, io.BytesIO(b'{}'))
            extractor.extract(archive, root/'out')
            self.assertEqual((root/'out/webm-installed-input-inventory.json').read_bytes(), b'{}')


if __name__ == '__main__':
    unittest.main()
