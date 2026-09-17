#!/usr/bin/env python3
"""Read-only prerequisite audit for maintained optional runtime builders.
Never grants release admission or substitutes binaries for missing sources.
"""
import argparse,pathlib,json,hashlib,shutil,sys
p=argparse.ArgumentParser();p.add_argument('--sdk',type=pathlib.Path,required=True);p.add_argument('--archives',type=pathlib.Path,required=True);a=p.parse_args();root=pathlib.Path(__file__).resolve().parents[1]
locked={x['name']:x for x in json.loads((root/'sources.lock.json').read_text())['sources']};issues=[];sources=[]
for name in ['ffmpeg','freetype','fribidi','harfbuzz','libass']:
 f=a.archives/(name+'.tar.gz');entry={'name':name,'path':str(f),'expectedSHA256':locked[name]['sha256'],'url':locked[name]['url'],'present':f.is_file()}
 if f.is_file():entry['actualSHA256']=hashlib.sha256(f.read_bytes()).hexdigest()
 if not f.is_file() or entry['actualSHA256']!=entry['expectedSHA256']:issues.append('Missing or mismatched locked archive: '+str(f))
 sources.append(entry)
v=a.sdk/'upstream/emscripten/emscripten-version.txt'
if not v.is_file() or json.loads(v.read_text())!='4.0.14':issues.append('Matching Emscripten 4.0.14 SDK missing: '+str(a.sdk))
for tool in ['meson','ninja','cmake','pkg-config','node']:
 if not shutil.which(tool):issues.append('Missing tool: '+tool)
print(json.dumps({'ready':not issues,'issues':issues,'sources':sources,'sdk':str(a.sdk),'requiredSDK':'4.0.14','interface':{'adaptation':2,'nativeASS':'verified by maintained manifest verifier'},'releaseQualified':False},indent=2));sys.exit(bool(issues))
