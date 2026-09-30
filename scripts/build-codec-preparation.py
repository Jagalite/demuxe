#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build a codec-specific FFmpeg preparation engine with the existing streaming ABI.

Uses a fresh isolated output, reviewed current adapters, locked upstream sources,
and the existing JSPI/Asyncify source bridge. Does not deploy or qualify engines.
"""
import argparse, hashlib, importlib.util, json
from pathlib import Path
import shutil, subprocess
ROOT=Path(__file__).resolve().parents[1]
PROFILES={'truehd-mlp':['truehd','mlp'],'dts-hd':['dca'],'ac3-eac3':['ac3','eac3']}
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--profile',choices=PROFILES,required=True)
p.add_argument('--suspension',choices=['jspi','asyncify'],required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--sdk',type=Path,required=True)
p.add_argument('--jobs',type=int,default=4)
a=p.parse_args();out=a.output.resolve()
source=ROOT/'experiments/jspi-asyncify/ffmpeg/scripts/prepare-ffmpeg.py'
spec=importlib.util.spec_from_file_location('prepare_codec_engine',source);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
m.prepare(ROOT,out,'transcode',a.suspension,revision)
# Snapshot current reviewed integration bytes; historical Git inputs remain
# identified separately in inputs.json. Every transformed input is retained.
(out/'native/remux/remux.c').write_text(m.patch_remux((ROOT/'native/remux/remux.c').read_text()))
flac=(ROOT/'native/adaptation/flac.h').read_text()
needle='if(channels<1||channels>8||av_channel_layout_compare(&f->ch_layout,&layouts[channels-1]))'
replacement='if(channels<1||channels>8||(av_channel_layout_compare(&f->ch_layout,&layouts[channels-1])&&!(channels==6&&f->ch_layout.order==AV_CHANNEL_ORDER_NATIVE&&f->ch_layout.u.mask==AV_CH_LAYOUT_5POINT1_BACK)))'
if flac.count(needle)!=1:raise ValueError('Reviewed canonical FLAC speaker-layout guard changed')
(out/'native/adaptation/flac.h').write_text(flac.replace(needle,replacement))
build=(out/'build-ffmpeg.py').read_text()
old="'--enable-decoder=ac3,eac3,dca,truehd,mlp,aac,mp3,mp3float,opus,vorbis,flac,alac,pcm_s16le,pcm_s24le,pcm_s32le,pcm_f32le,pcm_f64le','--enable-encoder=flac,opus'"
new=repr('--enable-decoder='+','.join(PROFILES[a.profile]))+",'--enable-encoder=flac'"
if build.count(old)!=1:raise ValueError('Reviewed FFmpeg configure decoder set changed')
build=build.replace(old,new)
build=build.replace("'SOURCE_DATE_EPOCH':'1740000000'", "'SOURCE_DATE_EPOCH':'1740000000','TMPDIR':str(out/'tmp')")
(out/'tmp').mkdir();(out/'build-ffmpeg.py').write_text(build)
shutil.copyfile(__file__,out/'codec-build-recipe.py')
inputs=json.loads((out/'inputs.json').read_text());inputs.update(codecProfile=a.profile,decoders=PROFILES[a.profile],encoders=['flac'],currentIntegrationSHA256={str(f.relative_to(ROOT)):hashlib.sha256(f.read_bytes()).hexdigest() for f in [ROOT/'native/remux/remux.c',ROOT/'native/adaptation/flac.h',Path(__file__)]},productionModified=False)
(out/'inputs.json').write_text(json.dumps(inputs,indent=2)+'\n')
subprocess.run(['python3',str(out/'build-ffmpeg.py'),'--sdk',str(a.sdk.resolve()),'--jobs',str(a.jobs),'--flac-level','0'],check=True)
text=(out/'objects/config_components.h').read_text()
import re
enabled=set(re.findall(r'^#define CONFIG_(\w+)_DECODER 1$',text,re.M))
expected={name.upper() for name in PROFILES[a.profile]}
if enabled!=expected:raise ValueError('Enabled decoder set differs: '+str(enabled)+' expected '+str(expected))
record=json.loads((out/'build-result.json').read_text());record.update(codecProfile=a.profile,enabledDecoders=sorted(enabled),currentRecipeSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),qualification='build-only')
(out/'build-result.json').write_text(json.dumps(record,indent=2)+'\n')
print(out/'engine')
