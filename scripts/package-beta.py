#!/usr/bin/env python3
"""Build an offline-installable beta candidate, without asserting release qualification."""
import argparse,gzip,hashlib,io,json,pathlib,subprocess,tarfile,re
root=pathlib.Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--output',type=pathlib.Path,default=root/'build/beta');p.add_argument('--yuv',action='store_true');p.add_argument('--release-tag');p.add_argument('--adaptation-build',type=pathlib.Path);p.add_argument('--ass-build',type=pathlib.Path);args=p.parse_args()
project=json.loads((root/'package.json').read_text())
source_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
dirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=root))
build=None;source_archive=None;optional_sources=[]
if args.release_tag:
 if args.ass_build:raise SystemExit('Native ASS remains experimental; release source/output admission is not qualified')
 if args.adaptation_build:raise SystemExit('Audio adaptation remains experimental; release admission is not qualified')
 if dirty:raise SystemExit('Release packaging requires a clean source checkout')
 if subprocess.check_output(['git','rev-parse',f'refs/tags/{args.release_tag}^{{commit}}'],cwd=root,text=True).strip()!=source_commit:raise SystemExit('Release tag must identify HEAD')
 if project.get('license') not in ['MIT','GPL-2.0-or-later'] or not (root/'LICENSE').is_file():raise SystemExit('Select and include the original-code license before release')
 if args.yuv:raise SystemExit('The clean beta release record covers only the three standard engines')
 build=json.loads((root/'build/beta-build.json').read_text())
 if not build['clean']:raise SystemExit('Release requires a completed clean engine build')
 sdk=pathlib.Path(build['sdk'])
 for name,digest in build['sdkSources'].items():
  if hashlib.sha256((sdk/'upstream/emscripten'/name).read_bytes()).hexdigest()!=digest:raise SystemExit('SDK source changed: '+name)
 for tool in build['sharedTools'].values():
  if hashlib.sha256(pathlib.Path(tool['path']).read_bytes()).hexdigest()!=tool['sha256']:raise SystemExit('Build tool changed: '+tool['path'])
 for group in ['inputs','configurations','artifacts']:
  for name,expected in build[group].items():
   digest=expected['sha256'] if isinstance(expected,dict) else expected
   if hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:raise SystemExit('Build record mismatch: '+name)
 for item in json.loads((root/'sources.lock.json').read_text())['sources']:
  if hashlib.sha256((root/'build/downloads'/(item['name']+'.tar.gz')).read_bytes()).hexdigest()!=item['sha256']:raise SystemExit('Source archive mismatch: '+item['name'])
 subprocess.run(['python3',str(root/'scripts/package-beta-source.py'),'--output',str(args.output),'--tag',args.release_tag],check=True)
 source_path=args.output/f"{project['name']}-{project['version']}-source.tar.gz"
 source_archive={'filename':source_path.name,'sha256':hashlib.sha256(source_path.read_bytes()).hexdigest(),'bytes':source_path.stat().st_size}

files={}
def add(name):
 f=root/name
 if not f.is_file():raise SystemExit('Missing runtime asset: '+name)
 files[name]=f.read_bytes()
# Only the dependency closure of the public entrypoints, including declarations.
pending=['web/generated/index.js','web/generated/player/index.js'];seen=set()
while pending:
 name=pending.pop()
 if name in seen:continue
 seen.add(name);add(name)
 if name.endswith('.js'):
  declaration=name[:-3]+'.d.ts'
  if (root/declaration).is_file():pending.append(declaration)
 for relative in re.findall(r"[\"'](\.[^\"']+\.js)[\"']",files[name].decode()):
  target=(root/name).parent.joinpath(relative).resolve()
  if target.is_relative_to(root/'web/generated'):
   if target.is_file():pending.append(str(target.relative_to(root)))
   declaration=target.with_suffix('.d.ts')
   if declaration.is_file():pending.append(str(declaration.relative_to(root)))
for name in ['native-ass-worker.js','audio-worklet.js','filter-retained-engine-worker.js','retained-decoder-worker.js','retained-video.js','subtitle-overlay.js','software-full-engine-worker.js','io-worker.js','range-reader.js','file-reader.js','resource-loader.js','vod-manifest.js','streaming-manifest.js','segmented-subtitles.js','native-remux-player.js','native-remux-worker.js','native-remux-source-worker.js','source-probe.js','cheap-mp4-probe.js','video-codec-config.js','remux-packaging.js']:
 add('web/'+name)
engines={'remux':('engine-remux','remux'),'hybrid':('engine-hybrid','player'),'software':('engine-software-full','player')}
if args.yuv:engines['experimental-yuv']=('engine-software-yuv','player');add('web/yuv-presenter.js')
if args.adaptation_build:
 adaptation=args.adaptation_build.resolve();record=json.loads((adaptation/'manifest.json').read_text())
 if record.get('linkSettings',{}).get('firstFragmentSeconds',0.5)!=0.5:raise SystemExit('Nondefault first-fragment sizing failed timestamp qualification; packaging is blocked')
 for filename in ['remux.mjs','remux.wasm']:
  expected=record['files'][str(adaptation/filename)]['sha256'];data=(adaptation/filename).read_bytes()
  if hashlib.sha256(data).hexdigest()!=expected:raise SystemExit('Adaptation artifact hash mismatch: '+filename)
  files['web/engine-adaptation/'+filename]=data
 # Keep full preferred FFmpeg source, applied patches and build materials beside
 # the local binary package. This is not release/source qualification.
 args.output.mkdir(parents=True,exist_ok=True)
 source_out=args.output/'demuxe-audio-adaptation-source.tar.gz'
 optional_sources.append(source_out)
 source_root=next((adaptation.parent/'source').iterdir())
 with tarfile.open(source_out,'w:gz') as archive:
  archive.add(source_root,arcname='ffmpeg')
  archive.add(adaptation/'sources',arcname='demuxe')
  source_checkout=pathlib.Path(next(k for k in record['files'] if k.endswith('/native/remux/remux.c'))).parents[2]
  for name in ['patches/ffmpeg','sources.lock.json','toolchain.lock.json']:
   archive.add(source_checkout/name,arcname='demuxe/'+name)
  archive.add(adaptation/'manifest.json',arcname='build-manifest.json')
  archive.add(adaptation.parent/'inputs.json',arcname='locked-inputs.json')
  archive.add(adaptation.parent/'ffmpeg/config.h',arcname='build/config.h')
  archive.add(adaptation.parent/'ffmpeg/ffbuild/config.mak',arcname='build/config.mak')
 files['web/engine-adaptation/manifest.json']=(json.dumps({'inputs':record['inputs'],'files':{pathlib.Path(k).name:v for k,v in record['files'].items() if pathlib.Path(k).suffix in ['.mjs','.wasm']},'sourceCompanion':{'filename':source_out.name,'sha256':hashlib.sha256(source_out.read_bytes()).hexdigest()},'profiles':['flac','opus'] if record['inputs'].get('opus') else ['flac'],'linkSettings':record.get('linkSettings',{}),'qualification':'experimental; explicit Native qualified profiles only; Opus requires lossy permission'},indent=2)+'\n').encode()
 for name in ['COPYING.LGPLv2.1','LICENSE.md']:
  files['third_party/notices/ffmpeg-adaptation/'+name]=(source_root/name).read_bytes()
if args.ass_build:
 ass=args.ass_build.resolve();record=json.loads((ass/'manifest.json').read_text())
 if record.get('apiVersion')!=2:raise SystemExit('ASS runtime interface mismatch; rebuild matching subtitle assets')
 for filename in ['subtitles.mjs','subtitles.wasm']:
  data=(ass/filename).read_bytes()
  if hashlib.sha256(data).hexdigest()!=record['files'][str(ass/filename)]['sha256']:raise SystemExit('ASS artifact hash mismatch: '+filename)
  files['web/engine-ass/'+filename]=data
 # Local source companion includes the precise wrapper and all preferred library
 # sources. A reused-library link is not proof of a clean release rebuild.
 library=pathlib.Path(next(k for k in record['files'] if k.endswith('/lib/libass.a'))).parents[3]
 args.output.mkdir(parents=True,exist_ok=True)
 source_out=args.output/'demuxe-native-ass-source.tar.gz'
 optional_sources.append(source_out)
 with tarfile.open(source_out,'w:gz') as archive:
  for name in ['libass','freetype','fribidi','harfbuzz']:
   archive.add(library/'build/sources'/name,arcname='libraries/'+name)
  archive.add(ass/'sources',arcname='demuxe')
  archive.add(ass/'manifest.json',arcname='build-manifest.json')
  for name in ['sources.lock.json','toolchain.lock.json','scripts/build.sh','scripts/fetch-sources.py','scripts/apply-patches.py']:
   archive.add(library/name,arcname='demuxe/'+name)
 files['web/engine-ass/manifest.json']=(json.dumps({'apiVersion':record['apiVersion'],'sources':record['sources'],'sdk':record['sdk'],'files':{pathlib.Path(k).name:v for k,v in record['files'].items() if pathlib.Path(k).suffix in ['.mjs','.wasm']},'sourceCompanion':{'filename':source_out.name,'sha256':hashlib.sha256(source_out.read_bytes()).hexdigest()},'qualification':'experimental external Native ASS; clean release library correspondence gate remains open'},indent=2)+'\n').encode()
for folder,stem in engines.values():
 for ext in ['mjs','wasm']:add(f'web/{folder}/{stem}.{ext}')
for name in ['fixtures/DejaVuSans.ttf','fixtures/FONT-LICENSE.txt','sources.lock.json','toolchain.lock.json','docs/BETA.md','docs/COMPATIBILITY-EXPANSION.md','docs/LICENSING.md','docs/RELEASE.md']:add(name)
if (root/'LICENSE').is_file():add('LICENSE')
if build:
 # Absolute host paths belong in the source companion, not the installed runtime.
 public_build={k:v for k,v in build.items() if k not in ['sdk','sharedTools']}
 public_build['sharedTools']={name:{k:v for k,v in tool.items() if k!='path'} for name,tool in build['sharedTools'].items()}
 files['engine-build.json']=(json.dumps(public_build,indent=2)+'\n').encode()
for f in sorted((root/'third_party').rglob('*')):
 if f.is_file():add(str(f.relative_to(root)))
for name in ['bin/demuxe.mjs','docs/PUBLIC-API.md','docs/OPTIMIZATION-INTEGRATION.md','docs/OPTIMIZATION-COMPLETION.md','docs/OPTIMIZATION-FLAC.md','docs/OPTIMIZATION-REVIEW-FIXES.md','docs/PUBLIC-API-VALIDATION.md','docs/PLAYER-COMPONENT.md','docs/API-MIGRATION.md','docs/BRANDING-MIGRATION.md','docs/RUNTIME-ASSETS.md','examples/custom-controls.html','examples/player-element.html']:add(name)
# The review report keeps local evidence locations in the repository only.
report='docs/OPTIMIZATION-INTEGRATION.md'
files[report]=re.sub(rb'/(?:Users|Volumes|private/var)/[^\s`]+',b'[local evidence path omitted from runtime package]',files[report])
files['player.js']=b"export * from './web/generated/player/index.js';\n"
files['player.d.ts']=b"export * from './web/generated/player/index.js';\n"
files['index.js']=b"export * from './web/generated/index.js';\n"
files['index.d.ts']=b"export * from './web/generated/index.js';\n"
files['README.md']=(root/'README.md').read_bytes()
for name in ['RELEASE.md','LICENSING.md','COMPATIBILITY-EXPANSION.md']:
 files['README.md']=files['README.md'].replace((']('+name+')').encode(),('](docs/'+name+')').encode())
package={'name':project['name'],'version':project['version'],'license':('GPL-2.0-or-later' if project.get('license') in ['MIT','GPL-2.0-or-later'] else 'UNLICENSED'),'demuxeOriginalCodeLicense':project.get('license','UNLICENSED'),'type':'module','main':'./index.js','types':'./index.d.ts','exports':{'.':{'types':'./index.d.ts','import':'./index.js'},'./player':{'types':'./player.d.ts','import':'./player.js'},'./release-manifest.json':'./release-manifest.json'},'bin':{project['name']:'./bin/demuxe.mjs'},'description':'Browser media compatibility runtime: Native, Hybrid, Software'}
package.update({key:project[key] for key in ['description','repository','bugs','homepage','keywords']})
package['exports']['./package.json']='./package.json'
files['package.json']=(json.dumps(package,indent=2)+'\n').encode()
manifest={'schema':1,'version':package['version'],'status':'beta-candidate-not-production-qualified','sourceCommit':source_commit,'dirtySource':dirty,'sourceTag':args.release_tag,'sourceArchive':source_archive,'engineBuildRecord':'engine-build.json' if build else None,'publicModes':['native','hybrid','software'],'automaticOrder':['native-direct','native-remux','hybrid','software'],'engines':engines,'defaultSoftwarePresenter':'rgb','qualification':{'functional':'See repository results and clean-consumer results for exact hashes','performance':'Workload-specific; no universal performance claim','production':False,'experimentalYUV':'Seek endurance and sustained-movie qualification remain open'},'files':{n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}for n,b in sorted(files.items())}}
files['release-manifest.json']=(json.dumps(manifest,indent=2)+'\n').encode()
# Reject host-specific paths and credential material, including strings in Wasm.
for name,data in files.items():
 if str(root).encode() in data or re.search(rb'/(?:Users|Volumes|private/var)/',data):raise SystemExit('Local build path leaked into package: '+name)
 if re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',data):raise SystemExit('Private key material in package: '+name)
args.output.mkdir(parents=True,exist_ok=True);out=args.output/f"{package['name']}-{package['version']}.tgz"
with out.open('wb')as f:
 with gzip.GzipFile(filename='',mode='wb',fileobj=f,mtime=0)as gz:
  with tarfile.open(fileobj=gz,mode='w',format=tarfile.PAX_FORMAT)as tar:
   for name,data in sorted(files.items()):
    info=tarfile.TarInfo('package/'+name);info.size=len(data);info.mode=0o755 if name=='bin/demuxe.mjs' else 0o644;info.mtime=0;tar.addfile(info,io.BytesIO(data))
(args.output/'release-manifest.json').write_bytes(files['release-manifest.json'])
digest=hashlib.sha256(out.read_bytes()).hexdigest()
lines=[f'{digest}  {out.name}']
for companion in optional_sources:lines.append(f'{hashlib.sha256(companion.read_bytes()).hexdigest()}  {companion.name}')
if source_archive:lines.append(f"{source_archive['sha256']}  {source_archive['filename']}")
(args.output/'SHA256SUMS').write_text('\n'.join(lines)+'\n')
print(out);print(digest)
