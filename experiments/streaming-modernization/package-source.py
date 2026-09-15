#!/usr/bin/env python3
"""Archive exact experimental preferred source and build evidence, without a tag."""
import argparse, gzip, hashlib, io, json, tarfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--work',required=True,type=Path);p.add_argument('--archive',required=True,type=Path)
p.add_argument('--build-log',required=True,type=Path);p.add_argument('--output',required=True,type=Path)
a=p.parse_args();work=a.work.resolve();out=a.output.resolve()
if out.exists():raise SystemExit('Use a new source artifact directory')
build=json.loads((work/'build/beta-build.json').read_text());inputs=json.loads((work/'build/modernization-inputs.json').read_text())
files={}
reuse_file=work/'build/native-build-reuse.json'
reuse=json.loads(reuse_file.read_text()) if reuse_file.exists() else {}
packaging_changes=reuse.get('changedPackagingFiles',{})
if set(packaging_changes)-{'scripts/package-beta.py'}:raise SystemExit('Unsupported reused build input change')
with tarfile.open(a.archive) as runtime:
 runtime_files=json.load(runtime.extractfile('package/release-manifest.json'))['files']
 generated={m.name.removeprefix('package/'):hashlib.sha256(runtime.extractfile(m).read()).hexdigest()
            for m in runtime.getmembers() if m.isfile() and m.name.startswith('package/web/generated/')}
expected={**inputs['sourceSHA256'],**inputs['overrides'],**inputs.get('transportOverrides',{}),**inputs.get('switchingOverrides',{}),**inputs.get('concurrentOverrides',{}),**inputs.get('integrationOverrides',{}),**inputs.get('qualityOverrides',{}),**inputs.get('liveOverrides',{}),**inputs.get('dashOverrides',{}),**inputs.get('discontinuityOverrides',{}),**inputs.get('subtitleOverrides',{}),**inputs.get('timelineOverrides',{})}
removed=inputs.get('removed')
if removed is None:
 profile=Path(__file__).resolve().parent/'baseline/profile.json'
 if hashlib.sha256(profile.read_bytes()).hexdigest()!=inputs['profileSHA256']:
  raise SystemExit('Historical snapshot needs its exact removal profile')
 removed=json.loads(profile.read_text())['removed']
for name in removed:
 if (work/name).exists():raise SystemExit('Removed input reappeared: '+name)
 expected.pop(name,None)
for name,digest in expected.items():
 f=work/name
 # Checked-in compiler output legitimately changes when the preferred TS
 # source is rebuilt. Bind that output to the exact runtime being accompanied.
 if name.startswith('web/generated/') and name in generated:digest=generated[name]
 if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=digest:
  raise SystemExit('Snapshot source changed: '+name)
 files['demuxe/'+name]=f
# New TypeScript modules are not necessarily checked into the development
# output tree; bind every shipped generated module to this exact compilation.
for name,digest in generated.items():
 f=work/name
 if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=digest:
  raise SystemExit('Generated runtime source changed: '+name)
 files['demuxe/'+name]=f
for name,digest in build['inputs'].items():
 f=work/name
 if name in packaging_changes:
  change=packaging_changes[name]
  original=work/'build/reused-inputs'/name
  if change['before']!=digest or change['after']!=hashlib.sha256(f.read_bytes()).hexdigest() or hashlib.sha256(original.read_bytes()).hexdigest()!=digest:raise SystemExit('Packaging reuse correspondence mismatch: '+name)
  files['build-materials/reused-inputs/'+name]=original
 elif hashlib.sha256(f.read_bytes()).hexdigest()!=digest:raise SystemExit('Build input changed: '+name)
 files['demuxe/'+name]=f
for name,digest in build['sources'].items():
 f=work/'build/downloads'/(name+'.tar.gz')
 if hashlib.sha256(f.read_bytes()).hexdigest()!=digest:raise SystemExit('Upstream archive changed: '+name)
 files['demuxe/build/downloads/'+name+'.tar.gz']=f
for name,digest in build['sdkSources'].items():
 f=Path(build['sdk'])/'upstream/emscripten'/name
 if hashlib.sha256(f.read_bytes()).hexdigest()!=digest:raise SystemExit('SDK source changed: '+name)
 files['toolchain/emscripten/'+name]=f
for name,digest in build['configurations'].items():
 f=work/name
 if hashlib.sha256(f.read_bytes()).hexdigest()!=digest:raise SystemExit('Configuration changed: '+name)
 files['build-materials/'+name]=f
for name in ['beta-build.json','beta-build-start.json','modernization-inputs.json']:
 files['build-materials/'+name]=work/'build'/name
if (work/'build/qualification-fixture-inputs.json').exists():
 files['build-materials/qualification-fixture-inputs.json']=work/'build/qualification-fixture-inputs.json'
for name in ['native-build-reuse.json','runtime-assembly.log']:
 if (work/'build'/name).exists():files['build-materials/'+name]=work/'build'/name
files['build-materials/clean-build.log']=a.build_log.resolve()
# Include the actual stage tooling and decisions, separately from the built snapshot.
root=Path(__file__).resolve().parent
for f in root.rglob('*'):
 if f.is_file() and '__pycache__' not in f.parts:files['experiment/'+str(f.relative_to(root))]=f
for name in ['STREAMING-ARCHITECTURE.md','STREAMING-UPSTREAM-FINDINGS.md']:
 files['experiment/docs/'+name]=root.parents[1]/'docs'/name
for name,entry in runtime_files.items():
 if name in build['artifacts']:
  if entry!=build['artifacts'][name]:raise SystemExit('Runtime engine/build mismatch: '+name)
  continue
 if name in ['package.json','index.js','index.d.ts','player.js','player.d.ts']:continue
 f=files.get('demuxe/'+name)
 if not f:raise SystemExit('Runtime source missing: '+name)
 content=f.read_bytes()
 if name=='README.md':
  for doc in ['RELEASE.md','LICENSING.md','COMPATIBILITY-EXPANSION.md']:
   content=content.replace((']('+doc+')').encode(),('](docs/'+doc+')').encode())
 if hashlib.sha256(content).hexdigest()!=entry['sha256']:
  raise SystemExit('Runtime/source mismatch: '+name)
out.mkdir(parents=True);target=out/'demuxe-modernization-source.tar.gz';hashes={};unpacked=0
record={'status':'uncommitted-experimental-source-correspondence','releaseQualified':False,'sourceTag':None,
 'baseCommit':inputs['baseCommit'],'runtimeSHA256':hashlib.sha256(a.archive.read_bytes()).hexdigest(),
 'buildRecordSHA256':hashlib.sha256((work/'build/beta-build.json').read_bytes()).hexdigest(),'files':hashes}
with target.open('wb') as raw,gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0) as gz,tarfile.open(fileobj=gz,mode='w|') as tar:
 for name,f in sorted(files.items()):
  data=f.read_bytes();unpacked+=len(data);hashes[name]=hashlib.sha256(data).hexdigest()
  info=tarfile.TarInfo(name);info.size=len(data);info.mode=0o755 if f.stat().st_mode&0o111 else 0o644;tar.addfile(info,io.BytesIO(data))
 data=(json.dumps(record,indent=2)+'\n').encode();unpacked+=len(data);info=tarfile.TarInfo('source-manifest.json');info.size=len(data);info.mode=0o644;tar.addfile(info,io.BytesIO(data))
summary={k:v for k,v in record.items() if k!='files'}
summary.update(file=target.name,bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),unpackedBytes=unpacked,fileCount=len(files)+1)
(out/'record.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
