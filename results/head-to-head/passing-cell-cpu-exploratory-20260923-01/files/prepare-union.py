#!/usr/bin/env python3
"""Add specialist and subtitle-isolation fixtures to a fresh head-to-head snapshot."""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
ASSETS = ROOT / 'build/head-to-head/assets-passing-cpu-exploratory-20260923-01'
SPECIAL_SOURCE = ROOT / 'build/head-to-head/assets-specialist-screen-02'
SPECIAL_RECORD = ROOT / 'results/head-to-head/demuxe-software-specialists-20260922-01/fixtures.json'
BITMAP_SOURCE = ROOT / 'build/head-to-head/assets-software-bitmap-isolation-20260923-01'
BITMAP_KEYS = ['h264-aac-pgs-isolation', 'h264-aac-vobsub-isolation']
SPECIAL_KEYS = [
    'hevc10-aac-mkv', 'hevc10-flac-mkv', 'hevc10-opus-mkv',
    'hevc10-flac-ass', 'hevc10-opus-ass', 'hdr10-truehd-pgs',
    'hdr10-dtshd-pgs', 'dv5-atmos-ass', 'dv81-atmos-ass',
]


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as stream:
        for part in iter(lambda: stream.read(1024 * 1024), b''):
            value.update(part)
    return value.hexdigest()


def copy_fixture(source_root, record, source_manifest, key):
    source_name = 'fixtures/' + record['file']
    expected = source_manifest['files'][source_name]['sha256']
    source = source_root / source_name
    target = ASSETS / source_name
    if digest(source) != expected:
        raise ValueError(f'source fixture hash mismatch: {source_name}')
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if digest(target) != expected:
            raise ValueError(f'fixture target collision with different bytes: {source_name}')
    else:
        shutil.copyfile(source, target)
    return {**record, 'key': key, 'source': str(source.relative_to(ROOT)),
            'source_sha256': expected}


catalogue_path = ASSETS / 'fixtures/catalogue.json'
catalogue = json.loads(catalogue_path.read_text())
special_fixtures = json.loads(SPECIAL_RECORD.read_text())
special_manifest = json.loads((SPECIAL_SOURCE / 'manifest.json').read_text())
bitmap_catalogue = json.loads((BITMAP_SOURCE / 'fixtures/catalogue.json').read_text())
bitmap_manifest = json.loads((BITMAP_SOURCE / 'manifest.json').read_text())
provenance = {'specialist': [], 'bitmapIsolation': []}

for key in SPECIAL_KEYS:
    if key in catalogue:
        raise ValueError(f'duplicate specialist fixture key: {key}')
    full = special_fixtures[key]
    copied = copy_fixture(SPECIAL_SOURCE, full, special_manifest, key)
    streams = full['probe']['streams']
    video = any(stream.get('codec_type') == 'video' for stream in streams)
    audio_streams = [stream for stream in streams if stream.get('codec_type') == 'audio']
    if not video or not audio_streams:
        raise ValueError(f'specialist fixture lacks A/V streams: {key}')
    fixture = {
        'label': full['label'], 'file': full['file'], 'video': True, 'audio': True,
        'channels': int(audio_streams[0].get('channels', 2)),
        'qualificationLimit': full.get('qualificationLimit'),
    }
    if full.get('embeddedSubtitle'):
        fixture['embeddedSubtitle'] = True
        fixture['subtitleCheck'] = full.get('subtitleCheck')
    catalogue[key] = fixture
    provenance['specialist'].append(copied)

for key in BITMAP_KEYS:
    if key in catalogue:
        raise ValueError(f'duplicate bitmap fixture key: {key}')
    record = bitmap_catalogue[key]
    catalogue[key] = record
    provenance['bitmapIsolation'].append(copy_fixture(
        BITMAP_SOURCE, record, bitmap_manifest, key))

catalogue_path.write_text(json.dumps(catalogue, indent=2) + '\n')
(ASSETS / 'preparation/merged-fixture-sources.json').write_text(
    json.dumps(provenance, indent=2) + '\n')

manifest_path = ASSETS / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['additional_fixture_sources'] = {
    'specialist_manifest_sha256': digest(SPECIAL_SOURCE / 'manifest.json'),
    'specialist_run_record_sha256': digest(SPECIAL_RECORD),
    'bitmap_manifest_sha256': digest(BITMAP_SOURCE / 'manifest.json'),
    'provenance_file': 'preparation/merged-fixture-sources.json',
}
manifest['files'] = {
    str(path.relative_to(ASSETS)): {'sha256': digest(path), 'bytes': path.stat().st_size}
    for path in sorted(ASSETS.rglob('*')) if path.is_file() and path != manifest_path
}
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'fixture_count': len(catalogue), 'specialist_added': len(SPECIAL_KEYS),
                  'bitmap_isolation_added': len(BITMAP_KEYS),
                  'manifest_file_count': len(manifest['files'])}, indent=2))
