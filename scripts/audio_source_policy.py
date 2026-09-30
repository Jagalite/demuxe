# SPDX-License-Identifier: Apache-2.0
"""Fail closed on native audio profile/source attribution before distribution."""
import json
from license_policy import ROOT

FFMPEG_PROFILES = {'ac3', 'dts', 'flac', 'common', 'truehd-mlp', 'dts-hd',
                   'aac', 'opus-vorbis', 'lossless', 'mp3', 'pcm'}

def pinned_audio_source(profile):
    profile = profile.removeprefix('audio-')
    if profile == 'opus-encoder':
        name = 'opus-audio'
    elif profile in FFMPEG_PROFILES:
        name = 'ffmpeg-adaptation'
    else:
        return None
    return next(source for source in json.loads((ROOT / 'sources.lock.json').read_bytes())['sources']
                if source['name'] == name)

def verify_audio_build_source(profile, record):
    expected = pinned_audio_source(profile)
    if expected is None or record.get('profile') != profile or record.get('source') != expected:
        raise ValueError('Audio profile requires its pinned native source: ' + profile)

def verify_audio_engine_source(target, engine):
    if not target.startswith('audio-'):
        return
    expected = pinned_audio_source(target)
    if expected is None or not engine or engine.get('sources') != {expected['name']: expected['sha256']}:
        raise ValueError('Audio provider requires its pinned native source: ' + target)
