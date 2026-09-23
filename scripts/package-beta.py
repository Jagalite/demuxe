#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Build an offline-installable beta candidate, without asserting release qualification."""
import argparse,gzip,hashlib,io,json,pathlib,subprocess,tarfile,re
from license_policy import Policy, LEGAL, encoded
root=pathlib.Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--output',type=pathlib.Path,default=root/'build/beta');p.add_argument('--yuv',action='store_true');p.add_argument('--release-tag');p.add_argument('--adaptation-build',type=pathlib.Path);p.add_argument('--ass-build',type=pathlib.Path);p.add_argument('--mpv-subtitles',action='store_true');args=p.parse_args()
# The switch remains accepted for older automation. A standard local candidate
# includes the service whenever its built runtime assets are present.
mpv_subtitles=args.mpv_subtitles or all((root/'web/engine-subtitles'/('service.'+ext)).is_file() for ext in ('mjs','wasm'))
project=json.loads((root/'package.json').read_text())
source_commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
dirty=bool(subprocess.check_output(['git','status','--porcelain'],cwd=root))
build=None;source_archive=None;optional_sources=[]
if mpv_subtitles and args.release_tag:raise SystemExit('mpv subtitle service requires separate clean-source release qualification')
if args.release_tag:
 # Optional assets remain subject to clean source correspondence here and
 # mandatory exact-archive optional evidence in verify-beta-release.py.
 if dirty:raise SystemExit('Release packaging requires a clean source checkout')
 if subprocess.check_output(['git','rev-parse',f'refs/tags/{args.release_tag}^{{commit}}'],cwd=root,text=True).strip()!=source_commit:raise SystemExit('Release tag must identify HEAD')
 if project.get('license') != 'GPL-3.0-or-later' or not (root/'LICENSE').is_file():raise SystemExit('Select and include the original-code license before release: complete player must be GPL-3.0-or-later')
 if args.yuv:raise SystemExit('The clean beta release record covers only the standard engines')
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

subprocess.run(['node',str(root/'scripts/copy-shaka-assets.mjs')],cwd=root,check=True)
subprocess.run(['python3',str(root/'scripts/check-licenses.py')],cwd=root,check=True)
license_policy=Policy(root)
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
   if not target.is_file():raise SystemExit('Missing generated runtime dependency: '+str(target.relative_to(root)))
   pending.append(str(target.relative_to(root)))
   declaration=target.with_suffix('.d.ts')
   if declaration.is_file():pending.append(str(declaration.relative_to(root)))
for name in ['mpv-subtitle-worker.js','native-ass-worker.js','audio-worklet.js','filter-retained-engine-worker.js','retained-decoder-worker.js','retained-video.js','subtitle-overlay.js','software-full-engine-worker.js','io-worker.js','range-reader.js','file-reader.js','resource-loader.js','fallback-stream-policy.js','split-mp4.js','native-remux-player.js','worker-remux-controller.js','native-mse-worker.js','native-remux-worker.js','native-remux-source-worker.js','source-probe.js','hybrid-preflight.js','prepared-engine.js','cheap-mp4-probe.js','selected-mp4-view.js','progressive-mp4.js','video-codec-config.js','remux-packaging.js']:
 add('web/'+name)
for name in json.loads((root/'third_party/shaka-player.json').read_text())['files']:add(name)
engines={'remux':('engine-remux','remux'),'hybrid':('engine-hybrid','player'),'software':('engine-software-full','player')}
if mpv_subtitles:engines['subtitles']=('engine-subtitles','service')
if args.yuv:engines['experimental-yuv']=('engine-software-yuv','player');add('web/yuv-presenter.js')
if args.adaptation_build:
 adaptation=args.adaptation_build.resolve();record=json.loads((adaptation/'manifest.json').read_text())
 if record.get('apiVersion')!=2:raise SystemExit('Preparation interface mismatch; rebuild matching assets')
 if args.release_tag and not record.get('cleanSourceBuild'):raise SystemExit('Release preparation requires clean preferred-source verification')
 preparation_verification=None
 if record.get('cleanSourceBuild'):
  preparation_verification=json.loads(subprocess.check_output(['python3',str(root/'scripts/verify-audio-adaptation-build.py'),str(adaptation)],text=True))
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
  for name in LEGAL:archive.add(root/name,arcname='demuxe/'+name)
  archive.add(adaptation.parent/'inputs.json',arcname='locked-inputs.json')
  archive.add(adaptation.parent/'ffmpeg/config.h',arcname='build/config.h')
  archive.add(adaptation.parent/'ffmpeg/ffbuild/config.mak',arcname='build/config.mak')
  if preparation_verification:
   archive.add(adaptation.parent/'preferred-source-hashes.json',arcname='preferred-source-hashes.json')
   archive.add(adaptation.parent/'ffmpeg/config_components.h',arcname='build/config_components.h')
   archive.add(root/'scripts/verify-audio-adaptation-build.py',arcname='demuxe/scripts/verify-audio-adaptation-build.py')
 files['web/engine-adaptation/manifest.json']=(json.dumps({'apiVersion':2,'sourceBuildVerification':preparation_verification,'inputs':record['inputs'],'files':{pathlib.Path(k).name:v for k,v in record['files'].items() if pathlib.Path(k).suffix in ['.mjs','.wasm']},'sourceCompanion':{'filename':source_out.name,'sha256':hashlib.sha256(source_out.read_bytes()).hexdigest()},'profiles':['flac','opus'] if record['inputs'].get('opus') else ['flac'],'linkSettings':record.get('linkSettings',{}),'qualification':'qualified file profiles; automatic FLAC requires explicit policy and source admission; Opus remains explicit and requires lossy permission'},indent=2)+'\n').encode()
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
 clean_ass=(library/'source-build.json').is_file()
 source_verification=None
 if clean_ass:
  source_verification=json.loads(subprocess.check_output(['python3',str(root/'scripts/verify-native-ass-build.py'),str(ass)],text=True))
 args.output.mkdir(parents=True,exist_ok=True)
 source_out=args.output/'demuxe-native-ass-source.tar.gz'
 optional_sources.append(source_out)
 with tarfile.open(source_out,'w:gz') as archive:
  for name in ['libass','freetype','fribidi','harfbuzz']:
   archive.add(library/'build/sources'/name,arcname='libraries/'+name)
  archive.add(ass/'sources',arcname='demuxe')
  archive.add(ass/'manifest.json',arcname='build-manifest.json')
  for name in LEGAL:archive.add(root/name,arcname='demuxe/'+name)
  if clean_ass:
   archive.add(library/'source-build.json',arcname='source-build.json')
   archive.add(library/'scripts/build-native-ass.py',arcname='demuxe/scripts/build-native-ass.py')
   archive.add(root/'scripts/verify-native-ass-build.py',arcname='demuxe/scripts/verify-native-ass-build.py')
  for name in ['sources.lock.json','toolchain.lock.json','scripts/build.sh','scripts/fetch-sources.py','scripts/apply-patches.py']:
   archive.add(library/name,arcname='demuxe/'+name)
 files['web/engine-ass/manifest.json']=(json.dumps({'sourceBuildVerification':source_verification,'apiVersion':record['apiVersion'],'sources':record['sources'],'sdk':record['sdk'],'files':{pathlib.Path(k).name:v for k,v in record['files'].items() if pathlib.Path(k).suffix in ['.mjs','.wasm']},'sourceCompanion':{'filename':source_out.name,'sha256':hashlib.sha256(source_out.read_bytes()).hexdigest()},'qualification':'External Native ASS; clean library correspondence verified; exact-archive release verification remains mandatory'},indent=2)+'\n').encode()
for folder,stem in engines.values():
 for ext in ['mjs','wasm']:add(f'web/{folder}/{stem}.{ext}')
for name in ['fixtures/DejaVuSans.ttf','fixtures/FONT-LICENSE.txt','sources.lock.json','toolchain.lock.json','docs/BETA.md','docs/COMPATIBILITY-EXPANSION.md','docs/LICENSING.md','docs/RELEASE.md']:add(name)
for name in LEGAL:add(name)
if build:
 # Absolute host paths belong in the source companion, not the installed runtime.
 public_build={k:v for k,v in build.items() if k not in ['sdk','sharedTools']}
 public_build['sharedTools']={name:{k:v for k,v in tool.items() if k!='path'} for name,tool in build['sharedTools'].items()}
 files['engine-build.json']=(json.dumps(public_build,indent=2)+'\n').encode()
for f in sorted((root/'third_party').rglob('*')):
 if f.is_file():add(str(f.relative_to(root)))
for name in ['bin/demuxe.mjs','docs/PUBLIC-API.md','docs/OPTIMIZATION-INTEGRATION.md','docs/OPTIMIZATION-COMPLETION.md','docs/OPTIMIZATION-FLAC.md','docs/OPTIMIZATION-REVIEW-FIXES.md','docs/PUBLIC-API-VALIDATION.md','docs/PLAYER-COMPONENT.md','docs/API-MIGRATION.md','docs/BRANDING-MIGRATION.md','docs/RUNTIME-ASSETS.md','docs/NON-ISOLATED-REMUX.md','docs/PLAYBACK-TIER-POLICY.md','docs/PRODUCTION-PIPELINE.md','docs/STREAMING-ARCHITECTURE.md','examples/custom-controls.html','examples/player-element.html']:add(name)
# The review report keeps local evidence locations in the repository only.
report='docs/OPTIMIZATION-INTEGRATION.md'
files[report]=re.sub(rb'/(?:Users|Volumes|private/var)/[^\s`]+',b'[local evidence path omitted from runtime package]',files[report])
files['player.js']=b"// SPDX-License-Identifier: GPL-3.0-or-later\nexport * from './web/generated/player/index.js';\n"
files['player.d.ts']=b"// SPDX-License-Identifier: GPL-3.0-or-later\nexport * from './web/generated/player/index.js';\n"
files['index.js']=b"// SPDX-License-Identifier: GPL-3.0-or-later\nexport * from './web/generated/index.js';\n"
files['index.d.ts']=b"// SPDX-License-Identifier: GPL-3.0-or-later\nexport * from './web/generated/index.js';\n"
files['README.md']=(root/'README.md').read_bytes()
for name in ['RELEASE.md','LICENSING.md','COMPATIBILITY-EXPANSION.md']:
 files['README.md']=files['README.md'].replace((']('+name+')').encode(),('](docs/'+name+')').encode())
package={'name':project['name'],'version':project['version'],'license':'GPL-3.0-or-later','demuxeLicenses':license_policy.config['packageLicenses'],'type':'module','main':'./index.js','types':'./index.d.ts','exports':{'.':{'types':'./index.d.ts','import':'./index.js'},'./player':{'types':'./player.d.ts','import':'./player.js'},'./release-manifest.json':'./release-manifest.json'},'bin':{project['name']:'./bin/demuxe.mjs'},'description':'Browser media compatibility runtime: Native, Hybrid, Software'}
package.update({key:project[key] for key in ['description','repository','bugs','homepage','keywords']})
package['exports']['./package.json']='./package.json'
files['package.json']=(json.dumps(package,indent=2)+'\n').encode()
files['license-map.json']=encoded(license_policy.package_map(files,'player'))
license_policy.check_package(files,'player')
manifest={'schema':1,'version':package['version'],'status':'beta-candidate-not-production-qualified','sourceCommit':source_commit,'dirtySource':dirty,'sourceTag':args.release_tag,'sourceArchive':source_archive,'engineBuildRecord':'engine-build.json' if build else None,'publicModes':['native','hybrid','software'],'automaticOrder':[*(['native-direct-mpv'] if mpv_subtitles else []),'native-direct',*(['native-remux-mpv'] if mpv_subtitles else []),'native-remux','shaka-mse','hybrid','software'],'adaptiveStreaming':{'backend':'shaka-mse','version':project['dependencies']['shaka-player'],'assets':'third_party/shaka-player.json','lazy':True},'engines':engines,'optionalQualificationRequired':bool(args.ass_build or args.adaptation_build or mpv_subtitles),'defaultSoftwarePresenter':'rgb','qualification':{'functional':'See repository results and clean-consumer results for exact hashes','performance':'Workload-specific; no universal performance claim','production':False,'experimentalYUV':'Seek endurance and sustained-movie qualification remain open'},'files':{n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}for n,b in sorted(files.items())}}
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
