#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Preferred-source distribution keeps build code while omitting Pages test media."""
import hashlib
import io
import json
import pathlib
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from shaka_source import ensure_source, pages_source


class SourceDistribution(unittest.TestCase):
    def test_pages_preserves_build_source_and_records_omitted_media(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            source = root / 'build/downloads/shaka.tar.gz'
            source.parent.mkdir(parents=True)
            entries = {'shaka/lib/player.js': b'source', 'shaka/build/build.py': b'build',
                       'shaka/LICENSE': b'license', 'shaka/test/test/assets/movie.mp4': b'media'}
            with tarfile.open(source, 'w:gz') as archive:
                for name, data in entries.items():
                    item = tarfile.TarInfo(name)
                    item.size = len(data)
                    archive.addfile(item, io.BytesIO(data))
            digest = hashlib.sha256(source.read_bytes()).hexdigest()
            (root / 'third_party').mkdir()
            (root / 'third_party/shaka-player.json').write_text(json.dumps({'preferredSource': {
                'filename': source.name, 'archiveRoot': 'shaka', 'bytes': source.stat().st_size,
                'sha256': digest, 'url': 'https://example.invalid/source'}}))
            self.assertEqual(ensure_source(root), source)
            with tarfile.open(pages_source(root)) as archive:
                self.assertNotIn('shaka/test/test/assets/movie.mp4', archive.getnames())
                for name in ['shaka/lib/player.js', 'shaka/build/build.py', 'shaka/LICENSE']:
                    self.assertEqual(archive.extractfile(name).read(), entries[name])
                self.assertIn(digest.encode(), archive.extractfile('DEMUXE-SOURCE-NOTE.txt').read())
            source.write_bytes(b'corrupt')
            with patch('urllib.request.urlopen', return_value=io.BytesIO(b'incorrect download')):
                with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                    ensure_source(root)


if __name__ == '__main__':
    unittest.main()
