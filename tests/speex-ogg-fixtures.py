#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Pinned original/generated Ogg Speex fixtures with independent scalar references."""
import hashlib
import json
import os
import pathlib
import shutil
import struct
import subprocess

root = pathlib.Path(os.environ.get('SPEEX_OGG_FIXTURE_ROOT', '/tmp/demuxe-speex-ogg-fixtures'))
reference = pathlib.Path(os.environ.get('SPEEX_OGG_REFERENCE_ROOT', '/tmp/demuxe-speex-ogg-nofma-reference'))
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
pins = {
    'male.wav': ('https://www.speex.org/samples/audio/male.wav', 'f7bac92a06c43aef7035d1e6527d933222acdedb28a2bb34c2923fb1a5ba2cf8'),
    'uwb_male_speex.spx': ('https://people.videolan.org/~tmatth/samples/uwb_male_speex.spx', '27cafad25ee99586d80d42571acd02d0b4a8cb8465331d7c6962a1c9efb8f974'),
    'talk109-q5.spx': ('https://samples.ffmpeg.org/A-codecs/speex/talk109-q5.spx', 'b3518ff8ed6c98c0df57a340bee0e3b8de0a012695848a3a5c557186684e95a0'),
}
for name, (_, digest) in pins.items():
    assert sha(root / name) == digest, 'Original fixture mismatch: ' + name
record = json.loads((reference / 'build-record.json').read_text())
for name in ['ffmpeg', 'ffprobe']:
    assert sha(reference / name) == record['artifacts'][name]['sha256']
encoder = json.loads((root / 'encoder-build.json').read_text())
assert encoder['sourceSHA256'] == '4b44d4f2b38a370a2d98a78329fefc56a0cf93d1c1be70029217baae6628feea'
assert sha(pathlib.Path(encoder['encoder']['path'])) == encoder['encoder']['sha256']
command = [encoder['encoder']['path'], '--narrowband', '--quality', '5', '--nframes', '1', str(root / 'male.wav'), str(root / 'speex-nb8.spx')]
subprocess.run(command, check=True)

def unhex(text):
    return bytes.fromhex(''.join(line.split(':')[1].split('  ')[0].replace(' ', '') for line in text.splitlines() if ':' in line))

rows = []
for ident, name, rate, samples in [('speex-nb8', 'speex-nb8.spx', 8000, 160), ('speex-uwb32', 'uwb_male_speex.spx', 32000, 640)]:
    source = root / name
    packet = root / (ident + '.json')
    packet.write_bytes(subprocess.check_output([str(reference / 'ffprobe'), '-v', 'error', '-show_streams', '-show_packets', '-show_data', '-of', 'json', str(source)]))
    data = json.loads(packet.read_text())
    stream, packets = data['streams'][0], data['packets']
    header = unhex(stream['extradata'])
    assert len(header) == 80 and header[:8] == b'Speex   '
    assert struct.unpack('<13i', header[28:]) == (1, 80, rate, 0 if rate == 8000 else 2, 4, 1, -1, samples, 0, 1, 0, 0, 0)
    first_pts = int(packets[0]['pts'])
    assert first_pts < 0 and all(int(p['pts']) == first_pts + index * samples for index, p in enumerate(packets))
    assert all(0 < len(unhex(p['data'])) <= 2048 for p in packets)
    assert all(int(p['duration']) == samples for p in packets[:-1]) and 0 < int(packets[-1]['duration']) <= samples
    final_granule = int(packets[-1]['pts']) + int(packets[-1]['duration'])
    frames = root / (ident + '.frames.json')
    frames.write_bytes(subprocess.check_output([str(reference / 'ffprobe'), '-v', 'error', '-show_frames', '-show_entries', 'frame=pts,nb_samples,sample_fmt', '-of', 'json', str(source)]))
    shape = json.loads(frames.read_text())['frames']
    assert len(shape) == len(packets) and all(f['nb_samples'] == samples and f['pts'] == int(p['pts']) for f, p in zip(shape, packets))
    for ext, fmt in [('f32', 'f32le'), ('s32', 's32le')]:
        subprocess.run([str(reference / 'ffmpeg'), '-v', 'error', '-xerror', '-cpuflags', '0', '-y', '-i', str(source), '-f', fmt, str(root / (ident + '.' + ext))], check=True)
    assert (root / (ident + '.f32')).stat().st_size == len(packets) * samples * 4
    origin = 'male.wav' if rate == 8000 else name
    rows.append(dict(id=ident, profile='speech', codec='speex', sampleRate=rate, channels=1, bitsPerSample=0, input=str(source), inputSHA256=sha(source), sourceURL=pins[origin][0], originSHA256=pins[origin][1], generated=rate == 8000, generation=command if rate == 8000 else None, fixtureRoot=str(root), packetSHA256=sha(packet), framesSHA256=sha(frames), referenceF32SHA256=sha(root / (ident + '.f32')), referenceIntegerSHA256=sha(root / (ident + '.s32')), referenceSamples=len(packets) * samples, frameSamples=samples, originalFirstPTS=first_pts, presentationEndSample=final_granule, originalPresentationExtent=final_granule - first_pts, codedClockPolicy='Original signed Ogg packet PTS supplied unchanged. Reference PCM retains complete decoded coded padding; no Ogg presentation conversion is admitted.', seekContract='restart-from-start-and-discard', extraDataSHA256=hashlib.sha256(header).hexdigest(), encoderBuildSHA256=sha(root / 'encoder-build.json') if rate == 8000 else None, referenceBuildSHA256=sha(reference / 'build-record.json')))
(root / 'fixtures.json').write_text(json.dumps(rows, indent=2) + '\n')
browser = []
for fixture in rows:
    ident = 'browser-' + fixture['id'] + '-ogg'
    for ext in ['json', 'frames.json', 'f32', 's32']:
        shutil.copyfile(root / (fixture['id'] + '.' + ext), root / (ident + '.' + ext))
    target = root / (ident + '.ogg')
    shutil.copyfile(fixture['input'], target)
    browser.append({**fixture, 'id': ident, 'input': str(target), 'generated': True, 'fixtureOrigin': 'generated-from-official-pcm' if fixture['generated'] else 'official', 'speexProfile': 'ogg-mono-cbr', 'sourceContainer': 'ogg', 'timestampGaps': [], 'packetClockPolicy': 'original-ogg-signed-pts', 'nativeFrameDuration': 0, 'speechFloatQualification': {'maxAbsoluteError': 7e-5, 'minimumSNR': 80, 'mandatorySilentControl': True, 'mandatoryCorruptControl': True}})
(root / 'packet-browser.json').write_text(json.dumps(browser, indent=2) + '\n')
standard = []
for fixture in browser:
    ident = fixture['id']
    timing = {'segments': [{'pts': frame['pts'], 'samples': frame['nb_samples']} for frame in json.loads((root / (ident + '.frames.json')).read_text())['frames']], 'toleranceSamples': 0, 'originalFirstPTS': fixture['originalFirstPTS'], 'packetClockPolicy': fixture['packetClockPolicy'], 'nativeFrameDuration': 0}
    timing_path = root / (ident + '.timing.json')
    timing_path.write_text(json.dumps(timing, indent=2) + '\n')
    standard.append({**fixture, 'packetFile': str(root / (ident + '.json')), 'reference': str(root / (ident + '.f32')), 'timingFile': str(timing_path), 'timingSHA256': sha(timing_path), 'originalTimingFile': str(root / (ident + '.frames.json')), 'originalTimingSHA256': sha(root / (ident + '.frames.json')), 'referenceBuildFile': str(reference / 'build-record.json'), 'referenceBinary': str(reference / 'ffmpeg'), 'referenceBinarySHA256': record['artifacts']['ffmpeg']['sha256'], 'nativeFrameDuration': 0, 'capabilityProfile': 'ogg-mono-cbr'})
(root / 'audio-conformance.json').write_text(json.dumps(standard, indent=2) + '\n')
containers = [{'id': 'conformance-' + f['id'], 'container': 'ogg', 'input': f['input'], 'inputSHA256': f['inputSHA256'], 'codec': 'speex', 'fixtureManifest': str(root / 'fixtures.json'), 'fixtureManifestSHA256': sha(root / 'fixtures.json')} for f in rows]
(root / 'container-fixtures.json').write_text(json.dumps(containers, indent=2) + '\n')
print(len(rows), 'Ogg Speex fixtures ready; original clocks and coded padding retained')
