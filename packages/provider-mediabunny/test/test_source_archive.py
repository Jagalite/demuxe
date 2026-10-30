#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Malformed corresponding-source archives must fail before extraction."""
import importlib.util
import hashlib
import gzip
import io
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('source-archive.py')
spec = importlib.util.spec_from_file_location('source_archive', SCRIPT)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


def create_archive(path, rows):
    with tarfile.open(path, 'w:gz') as archive:
        for name, kind, data in rows:
            item = tarfile.TarInfo(name)
            if kind == 'file':
                item.size = len(data)
                archive.addfile(item, io.BytesIO(data))
            elif kind == 'directory':
                item.type = tarfile.DIRTYPE
                archive.addfile(item)
            else:
                item.type = tarfile.SYMTYPE
                item.linkname = data
                archive.addfile(item)


class SourceArchiveTests(unittest.TestCase):
    def test_unsafe_members_do_not_extract_anything(self):
        variants = {
            'duplicate': [('good', 'file', b'ok'), ('good', 'file', b'bad')],
            'duplicate-directory': [('dir/', 'directory', b''), ('dir', 'directory', b'')],
            'parent-file-first': [('parent', 'file', b'x'), ('parent/child', 'file', b'y')],
            'parent-file-last': [('parent/child', 'file', b'y'), ('parent', 'file', b'x')],
            'traversal': [('good', 'file', b'ok'), ('../escape', 'file', b'bad')],
            'absolute': [('/escape', 'file', b'bad')],
            'uncanonical': [('a//b', 'file', b'bad')],
            'dot': [('a/./b', 'file', b'bad')],
            'backslash': [('a\\b', 'file', b'bad')],
            'symlink': [('good', 'file', b'ok'), ('link', 'symlink', '../escape')],
            'appledouble': [('dir/._file', 'file', b'bad')],
            'node-modules': [('node_modules/a', 'file', b'bad')],
        }
        for label, rows in variants.items():
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temp:
                root = Path(temp); archive = root / 'source.tar.gz'; output = root / 'output'; output.mkdir()
                create_archive(archive, rows)
                result = subprocess.run([sys.executable, str(SCRIPT), str(archive), '--extract', str(output)], capture_output=True)
                self.assertNotEqual(result.returncode, 0, label)
                self.assertEqual(list(output.iterdir()), [], label)
                self.assertFalse((root / 'escape').exists(), label)

    def test_entry_and_byte_limits(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'source.tar.gz'
            create_archive(path, [('one', 'file', b'abc'), ('two', 'file', b'def')])
            for setting, limit in [('MAX_ENTRIES', 1), ('MAX_FILE_BYTES', 2), ('MAX_TOTAL_BYTES', 5)]:
                with self.subTest(setting=setting):
                    original = getattr(validator, setting)
                    try:
                        setattr(validator, setting, limit)
                        with tarfile.open(path, 'r:gz') as archive, self.assertRaises(ValueError):
                            validator.validate(archive)
                    finally:
                        setattr(validator, setting, original)

    def test_truncated_payload_is_rejected_before_any_extraction(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); archive = root / 'source.tar.gz'; output = root / 'output'; output.mkdir()
            first = tarfile.TarInfo('first'); first.size = 2
            second = tarfile.TarInfo('second'); second.size = 4096
            raw = first.tobuf() + b'ok' + b'\0' * 510 + second.tobuf() + b'incomplete'
            archive.write_bytes(gzip.compress(raw))
            result = subprocess.run([sys.executable, str(SCRIPT), str(archive), '--extract', str(output)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(list(output.iterdir()), [])

    def test_digest_mismatch_does_not_extract(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); archive = root / 'source.tar.gz'; output = root / 'output'; output.mkdir()
            create_archive(archive, [('file', 'file', b'valid')])
            wrong = subprocess.run([sys.executable, str(SCRIPT), str(archive), '--sha256', '0' * 64, '--extract', str(output)], capture_output=True)
            self.assertNotEqual(wrong.returncode, 0)
            self.assertEqual(list(output.iterdir()), [])
            digest = hashlib.sha256(archive.read_bytes()).hexdigest()
            bad_size = subprocess.run([sys.executable, str(SCRIPT), str(archive), '--sha256', digest, '--bytes', '1', '--extract', str(output)], capture_output=True)
            self.assertNotEqual(bad_size.returncode, 0)
            self.assertEqual(list(output.iterdir()), [])
            correct = subprocess.run([sys.executable, str(SCRIPT), str(archive), '--sha256', digest, '--bytes', str(archive.stat().st_size), '--extract', str(output)], capture_output=True)
            self.assertEqual(correct.returncode, 0, correct.stderr)
            self.assertEqual((output / 'file').read_bytes(), b'valid')

    def test_valid_archive_and_nonempty_destination(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); archive = root / 'source.tar.gz'; output = root / 'output'; output.mkdir()
            create_archive(archive, [('folder', 'directory', b''), ('folder/file', 'file', b'valid')])
            result = subprocess.run([sys.executable, str(SCRIPT), str(archive), '--extract', str(output)], capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((output / 'folder/file').read_bytes(), b'valid')
            result = subprocess.run([sys.executable, str(SCRIPT), str(archive), '--extract', str(output)], capture_output=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual((output / 'folder/file').read_bytes(), b'valid')


if __name__ == '__main__':
    unittest.main()
