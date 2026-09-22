#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Bind passing exact-archive tests and corresponding source to a release record."""
import argparse, hashlib, json, os, pathlib, subprocess, tarfile, tempfile
from license_policy import Policy, archive_files, LEGAL
root=pathlib.Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--archive',type=pathlib.Path,required=True);p.add_argument('--source',type=pathlib.Path,required=True);p.add_argument('--consumer',type=pathlib.Path,nargs=2,required=True);p.add_argument('--streaming',type=pathlib.Path,nargs=2,required=True);p.add_argument('--extra',type=pathlib.Path,required=True);p.add_argument('--optional',type=pathlib.Path);p.add_argument('--shaka',type=pathlib.Path,nargs=2);args=p.parse_args()
def sha(data):return hashlib.sha256(data).hexdigest()
def archive_sha(path):
 h=hashlib.sha256()
 with path.open('rb')as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
runtime_hash=archive_sha(args.archive)
Policy(root).check_package(archive_files(args.archive),'player')
with tarfile.open(args.archive)as tar:
 manifest=json.load(tar.extractfile('package/release-manifest.json'))
 if manifest['dirtySource']or not manifest['sourceTag']or not manifest['sourceArchive']:raise SystemExit('Not a tagged source-backed release candidate')
 for name,expected in manifest['files'].items():
  if sha(tar.extractfile('package/'+name).read())!=expected['sha256']:raise SystemExit('Runtime hash mismatch: '+name)
 build=json.load(tar.extractfile('package/engine-build.json'))
 reader=tar.extractfile('package/web/range-reader.js').read()
 for engine in ['ass','adaptation']:
  name='web/engine-'+engine+'/manifest.json'
  if name not in manifest['files']:continue
  optional=json.load(tar.extractfile('package/'+name))
  if not optional.get('sourceBuildVerification',{}).get('verified'):raise SystemExit('Optional engine lacks clean source correspondence: '+engine)
  companion=optional['sourceCompanion']
  if pathlib.Path(companion['filename']).name!=companion['filename']:raise SystemExit('Invalid optional source companion path')
  path=args.archive.parent/companion['filename']
  if archive_sha(path)!=companion['sha256']:raise SystemExit('Optional source companion differs: '+engine)

source_hash=archive_sha(args.source)
if source_hash!=manifest['sourceArchive']['sha256']:raise SystemExit('Source archive does not match runtime')
with tarfile.open(args.source)as tar:
 source=json.load(tar.extractfile('source-manifest.json'))
 for name in LEGAL:
  data=tar.extractfile('demuxe/'+name).read()
  if data!=(root/name).read_bytes():raise SystemExit('Corresponding source license material differs: '+name)
 if (source['sourceCommit'],source['sourceTag'])!=(manifest['sourceCommit'],manifest['sourceTag']):raise SystemExit('Source revision mismatch')
 for name,digest in source['files'].items():
  if sha(tar.extractfile(name).read())!=digest:raise SystemExit('Source content mismatch: '+name)
 for name,digest in build['sdkSources'].items():
  if source['files'].get('toolchain/emscripten/'+name)!=digest:raise SystemExit('Missing corresponding SDK source: '+name)
 for name,digest in build['inputs'].items():
  if source['files'].get('demuxe/'+name)!=digest:raise SystemExit('Missing corresponding engine source: '+name)
 if manifest.get('adaptiveStreaming'):
  shaka_record=tar.extractfile('demuxe/third_party/shaka-player.json').read()
  if sha(shaka_record)!=manifest['files']['third_party/shaka-player.json']['sha256']:raise SystemExit('Shaka source inventory differs from runtime')
  shaka_pin=json.loads(shaka_record)['preferredSource']
  if source['files'].get('demuxe/build/downloads/'+shaka_pin['filename'])!=shaka_pin['sha256']:raise SystemExit('Missing pinned Shaka preferred-source archive')
optional_present=any(name.startswith(('web/engine-ass/','web/engine-adaptation/')) for name in manifest['files'])
if optional_present and not args.optional:raise SystemExit('Optional runtime release requires exact-archive optional qualification')
from optional_release import required_consumer_cases
consumer_cases=required_consumer_cases(manifest)
streaming_cases={f'{mode}:{test}'for mode in ['hybrid','software']for test in ['seek-completes-packet','seek-deadline','destroy-progress']}
evidence=[]
if manifest.get('adaptiveStreaming'):
 if not args.shaka:raise SystemExit('Shaka runtime release requires exact-archive Chrome and Firefox streaming consumer evidence (--shaka)')
 families=set()
 for file in args.shaka:
  data=json.loads(file.read_text());families.add(data['family'])
  if data['archiveSHA256']!=runtime_hash or data.get('sourceCommit')!=manifest['sourceCommit']:raise SystemExit('Shaka consumer used a different archive or source revision: '+str(file))
  if not data.get('passed') or not data.get('typecheck') or {c['name']for c in data['cases']}!={'native-direct','hls-ts','hls-fmp4','dash'} or not all(c.get('passed')for c in data['cases']):raise SystemExit('Incomplete/failed Shaka consumer suite: '+str(file))
  if data['testHarnessSHA256']!=source['files'].get('demuxe/tests/shaka-package.mjs'):raise SystemExit('Shaka consumer harness differs from tagged source: '+str(file))
  evidence.append({'file':str(file.resolve()),'sha256':archive_sha(file),'browser':data['family'],'suite':'shaka-exact-archive','cases':len(data['cases'])})
 if families!={'chrome','firefox'}:raise SystemExit('Shaka consumers require both Chrome and Firefox evidence')
if optional_present:
 from optional_release import verify
 evidence.append(verify(args.optional,args.archive,manifest,source['files']))
for paths,script,expected in [(args.consumer,'tests/beta-consumer.mjs',consumer_cases),(args.streaming,'tests/beta-streaming.mjs',streaming_cases)]:
 families=set()
 for file in paths:
  data=json.loads(file.read_text());families.add(data['family'])
  if data['archiveSHA256']!=runtime_hash:raise SystemExit('Test used different archive: '+str(file))
  if not data['passed']or not all(c.get('passed')for c in data['cases'])or {c['name']for c in data['cases']}!=expected:raise SystemExit('Incomplete/failed test suite: '+str(file))
  if data['testHarnessSHA256']!=source['files'].get('demuxe/'+script):raise SystemExit('Test harness differs from tagged source: '+str(file))
  evidence.append({'file':str(file.resolve()),'sha256':archive_sha(file),'browser':data['family'],'cases':len(data['cases'])})
 if families!={'chrome','firefox'}:raise SystemExit('Both Chrome and Firefox results are required')
extra=json.loads(args.extra.read_text())
expected_extra={'cli','consumer-chrome','consumer-firefox','public-api-chrome','public-api-firefox','component-chrome','component-firefox','menu-review'}
if extra['archiveSHA256']!=runtime_hash or extra['sourceCommit']!=manifest['sourceCommit'] or not extra['passed'] or {c['name'] for c in extra['checks']}!=expected_extra or not all(c['passed'] for c in extra['checks']):raise SystemExit('Incomplete or mismatched extra release qualification')
required_harnesses={'tests/release-extra.mjs','tests/beta-consumer.mjs','tests/beta-streaming.mjs','tests/public-api-consumer.mjs','tests/public-api.mjs','tests/player-component.mjs','tests/player-menu-review.mjs','tests/copy-assets.mjs','scripts/serve.mjs'}
if set(extra['harnesses'])!=required_harnesses:raise SystemExit('Missing extra test harness hashes')
for name,digest in extra['harnesses'].items():
 if digest!=source['files'].get('demuxe/'+name):raise SystemExit('Extra harness differs from tagged source: '+name)
for check in extra['checks']:
 if archive_sha(args.extra.parent/check['log'])!=check['sha256']:raise SystemExit('Extra test log changed')
evidence.append({'file':str(args.extra.resolve()),'sha256':archive_sha(args.extra),'suite':'public-api-component-cli-exports-typescript','checks':len(extra['checks'])})
# Run the tagged deterministic deadline tests against this archive's reader bytes.
with tempfile.TemporaryDirectory(dir=root/'build')as temporary:
 work=pathlib.Path(temporary);module=work/'range-reader.mjs';module.write_bytes(reader)
 with tarfile.open(args.source)as tar:test=tar.extractfile('demuxe/tests/range-reader-deadline.mjs').read()
 testfile=work/'range-reader-deadline.mjs';testfile.write_bytes(test)
 process=subprocess.run(['node','--test',str(testfile)],env={**os.environ,'RANGE_READER_MODULE':str(module)},text=True,capture_output=True)
 if process.returncode:raise SystemExit(process.stdout+process.stderr)
 log=args.archive.parent/'deadline-tests.txt';log.write_text(process.stdout+process.stderr)
 evidence.append({'file':str(log.resolve()),'sha256':archive_sha(log),'testHarnessSHA256':sha(test),'suite':'range-reader-deadline'})
record={'status':'developer-beta-candidate-tested','sourceCommit':manifest['sourceCommit'],'sourceTag':manifest['sourceTag'],'runtime':{'file':args.archive.name,'sha256':runtime_hash},'source':{'file':args.source.name,'sha256':source_hash},'tests':evidence,'qualification':'Functional developer beta only; not production, legal, physical AV or universal codec qualification'}
out=args.archive.parent/'verification.json';out.write_text(json.dumps(record,indent=2)+'\n');print(out)
