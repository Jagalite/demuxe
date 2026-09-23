#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Verify clean preparation sources, linked libraries and audio-only configuration."""
import argparse, hashlib, json, pathlib, re

def verify(engine):
    engine=engine.resolve();record=json.loads((engine/'manifest.json').read_text())
    if record.get('apiVersion')!=2:raise ValueError('Preparation interface mismatch; rebuild matching assets')
    if not record.get('cleanSourceBuild'):
        raise ValueError('Adaptation build lacks clean preferred-source evidence')
    def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
    for name,item in record['files'].items():
        if digest(pathlib.Path(name))!=item['sha256']:
            raise ValueError('Adaptation build hash mismatch: '+name)
    base=engine.parent
    preferred=json.loads((base/'preferred-source-hashes.json').read_text())
    source=next((base/'source').iterdir()).resolve()
    for name,expected in preferred.items():
        path=(source/name).resolve()
        if not path.is_relative_to(source):raise ValueError('Preferred source path escapes its directory')
        if digest(path)!=expected:raise ValueError('Preferred source changed: '+name)
    config=(base/'ffmpeg/config_components.h').read_text()
    header=(base/'ffmpeg/config.h').read_text()
    for flag in ['GPL','GPLV3','NONFREE','POSTPROC','VERSION3']:
        if not re.search(r'^#define CONFIG_'+flag+r' 0$',header,re.M):
            raise ValueError('Preparation FFmpeg is not LGPL-safe: CONFIG_'+flag)
    if '#define FFMPEG_LICENSE "LGPL version 2.1 or later"' not in header:
        raise ValueError('Preparation FFmpeg did not report LGPL')
    decoders=set(re.findall(r'^#define CONFIG_(\w+)_DECODER 1$',config,re.M))
    encoders=set(re.findall(r'^#define CONFIG_(\w+)_ENCODER 1$',config,re.M))
    if decoders!={'PCM_S16LE','PCM_S24LE','PCM_S32LE','FLAC','DCA'}:
        raise ValueError('Preparation decoder inventory changed')
    if encoders!=({'FLAC','OPUS'} if record['inputs'].get('opus') else {'FLAC'}):
        raise ValueError('Preparation encoder inventory changed')
    required=[base/'preferred-source-hashes.json',base/'ffmpeg/config.h',base/'ffmpeg/config_components.h',base/'ffmpeg/ffbuild/config.mak',engine/'remux.map',engine/'remux.mjs',engine/'remux.wasm']
    required += [base/'ffmpeg'/n/(n+'.a') for n in ['libavformat','libavcodec','libavutil']]
    if any(str(path) not in record['files'] for path in required):
        raise ValueError('Missing linked preparation inventory')
    if 'libpostproc' in (engine/'remux.map').read_text().lower():
        raise ValueError('Preparation engine linked libpostproc')
    if not (engine/'remux.mjs').read_bytes().startswith(b'// SPDX-License-Identifier: LGPL-2.1-or-later\n'):
        raise ValueError('Preparation engine has incorrect LGPL header')
    for relative in ['native/remux/remux.c','native/adaptation/flac.h','scripts/build-audio-adaptation.py','scripts/stamp-engine-license.py']:
        original=next(v['sha256'] for k,v in record['files'].items() if k.endswith('/'+relative))
        if digest(engine/'sources'/relative)!=original:raise ValueError('Preparation source snapshot mismatch: '+relative)
    return {'verified':True,'preferredSourceFiles':len(preferred),'decoders':sorted(decoders),'encoders':sorted(encoders),'releaseQualified':False}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('engine',type=pathlib.Path)
    print(json.dumps(verify(parser.parse_args().engine),indent=2))
