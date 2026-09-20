#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Fetch/verify the official pinned Shaka preferred source for distribution."""
import hashlib
import gzip
import io
import json
import pathlib
import tarfile
import urllib.request


def ensure_source(root):
    root = pathlib.Path(root)
    pin = json.loads((root / 'third_party/shaka-player.json').read_text())['preferredSource']
    target = root / 'build/downloads' / pin['filename']

    def matches(path):
        if not path.is_file() or path.stat().st_size != pin['bytes']:
            return False
        digest = hashlib.sha256()
        with path.open('rb') as source:
            for block in iter(lambda: source.read(1048576), b''):
                digest.update(block)
        return digest.hexdigest() == pin['sha256']

    if not matches(target):
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_suffix('.download')
        with urllib.request.urlopen(pin['url'], timeout=60) as source, temporary.open('wb') as output:
            for block in iter(lambda: source.read(1048576), b''):
                output.write(block)
        if not matches(temporary):
            raise ValueError('Shaka preferred-source archive hash mismatch: ' + str(temporary))
        temporary.replace(target)
    return target


def pages_source(root):
    """Keep preferred source/build files below Pages' 100 MiB asset limit."""
    root = pathlib.Path(root)
    original = ensure_source(root)
    pin = json.loads((root / 'third_party/shaka-player.json').read_text())['preferredSource']
    target = original.with_name('shaka-player-preferred-source.tar.gz')
    prefix = pin['archiveRoot'] + '/test/test/assets/'
    notice = ('This archive preserves the pinned official Shaka source and build files.\n'
              'Only test/test/assets/ media fixtures are omitted; they are not build inputs.\n'
              'Full upstream archive: ' + pin['url'] + '\nSHA256: ' + pin['sha256'] + '\n').encode()
    with tarfile.open(original) as source, target.open('wb') as output, gzip.GzipFile(filename='', mode='wb', fileobj=output, mtime=0) as compressed, tarfile.open(fileobj=compressed, mode='w|') as archive:
        for member in source:
            if member.name.startswith(prefix) or not member.isfile():
                continue
            data = source.extractfile(member).read()
            info = tarfile.TarInfo(member.name)
            info.size = len(data)
            info.mode = 0o755 if member.mode & 0o111 else 0o644
            info.mtime = 0
            archive.addfile(info, io.BytesIO(data))
        info = tarfile.TarInfo('DEMUXE-SOURCE-NOTE.txt')
        info.size = len(notice)
        info.mtime = 0
        archive.addfile(info, io.BytesIO(notice))
    return target


if __name__ == '__main__':
    print(ensure_source(pathlib.Path(__file__).resolve().parent.parent))
