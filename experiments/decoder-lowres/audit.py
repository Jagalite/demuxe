#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Audit FFmpeg's configured and Wasm-linked decoder declarations."""
import json
import re
from pathlib import Path

root=Path('build/sources/ffmpeg/libavcodec')
config=Path('build/obj-software-full-ffmpeg/config_components.h').read_text()
linked=Path('build/link-maps/software-yuv.map').read_text()
enabled=set(re.findall(r'#define CONFIG_(\w+)_DECODER 1',config))
rows=[]
for path in root.glob('*.c'):
    source=path.read_text(errors='replace')
    for match in re.finditer(r'const FFCodec\s+ff_(\w+)_decoder\s*=\s*\{',source):
        body=source[match.end():].split('};',1)[0]
        lowres=re.search(r'\.p\.max_lowres\s*=\s*(\d+)',body)
        if not lowres or not int(lowres.group(1)):continue
        name=match.group(1)
        rows.append({'decoder':name,'max_lowres':int(lowres.group(1)),'configured':name.upper() in enabled,'wasm_linked':bool(re.search(r'\bff_'+name+r'_decoder\b',linked)),'source':str(path)})
print(json.dumps({'linked':[r for r in rows if r['configured'] and r['wasm_linked']],'other_declarations':[r for r in rows if not(r['configured'] and r['wasm_linked'])]},indent=2))
