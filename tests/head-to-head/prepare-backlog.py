#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Extend a verified frozen candidate with pinned Video.js and local private engines."""
import argparse, hashlib, io, json, pathlib, shutil, tarfile, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
VIDEOJS_URL = 'https://registry.npmjs.org/video.js/-/video.js-8.24.1.tgz'
VIDEOJS_SHA = 'ae4c208cb6e8d1f42af45009bfcaead2e5e6ee2de58cf7a67b9413e7ff87a5fd'

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def prepare(parent, out, extra=None):
    original = json.loads((parent / 'manifest.json').read_text())
    for name, record in original['files'].items():
        assert sha(parent / name) == record['sha256'], name
    assert not out.exists(), out
    shutil.copytree(parent, out)
    if extra:
        extra_manifest = json.loads((extra/'manifest.json').read_text())
        catalogue = json.loads((out/'fixtures/catalogue.json').read_text())
        incoming = json.loads((extra/'fixtures/catalogue.json').read_text())
        imported = []
        for key, fixture in incoming.items():
            if key in catalogue:
                continue
            name = 'fixtures/'+fixture['file']
            assert sha(extra/name) == extra_manifest['files'][name]['sha256'], name
            fixture = dict(fixture)
            fixture['importedOriginalFile'] = fixture['file']
            fixture['file'] = 'backlog-imports/'+key+'/'+pathlib.Path(name).name
            dest = out/'fixtures'/fixture['file']
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(extra/name, dest)
            catalogue[key] = fixture
            imported.append(key)
        (out/'fixtures/catalogue.json').write_text(json.dumps(catalogue, indent=2)+'\n')
        original['extraCatalogue'] = {'path': str(extra.resolve()), 'manifestSHA256': sha(extra/'manifest.json'), 'imported': imported}
    web = out / 'demuxe/web'
    additions = {}
    for pattern in ['engine-*-jspi', 'engine-*-asyncify', 'private-ffmpeg', 'private-mpv']:
        for source in sorted((ROOT / 'web').glob(pattern)):
            for p in source.rglob('*'):
                if p.is_file():
                    dest = web / p.relative_to(ROOT / 'web')
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(p, dest)
                    additions[str(p.relative_to(ROOT))] = sha(p)
            if source.name.startswith('engine-'):
                original['engines'][source.name] = True
    data = urllib.request.urlopen(VIDEOJS_URL).read()
    assert hashlib.sha256(data).hexdigest() == VIDEOJS_SHA
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        for name in ['dist/video.min.js', 'dist/video-js.min.css', 'LICENSE', 'package.json']:
            dest = out / 'videojs' / name
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(archive.extractfile('package/' + name).read())
    original['backlogPreparation'] = {'parent': str(parent.resolve()), 'parentSHA256': sha(parent/'manifest.json'),
        'videojs': {'version': '8.24.1', 'url': VIDEOJS_URL, 'sha256': VIDEOJS_SHA},
        'localPrivateAssets': additions}
    shutil.copyfile(__file__, out/'preparation-backlog.py')
    original['files'] = {str(p.relative_to(out)): {'sha256': sha(p), 'bytes': p.stat().st_size}
        for p in sorted(out.rglob('*')) if p.is_file() and p != out/'manifest.json'}
    (out/'manifest.json').write_text(json.dumps(original, indent=2)+'\n')
    print(out)

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('parent', type=pathlib.Path)
    p.add_argument('output', type=pathlib.Path)
    p.add_argument('--extra', type=pathlib.Path)
    args = p.parse_args()
    prepare(args.parent, args.output, args.extra)
