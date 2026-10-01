#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Retain exact pthread/private playback native groups without rebuilding engines.

The original preferred maps/records and source manifests remain namespaced. This
establishes runtime/source correspondence; it never grants release or clean
pthread dependency rebuild qualification.
"""
import argparse,copy,hashlib,json,pathlib,tarfile
from private_remux_assets import verify_private_mpv_release

def encoded(x):return (json.dumps(x,indent=2,sort_keys=True)+'\n').encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def file_sha(p):
 h=hashlib.sha256()
 with pathlib.Path(p).open('rb')as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def safe(n):
 p=pathlib.PurePosixPath(n)
 if not n or p.is_absolute() or '..'in p.parts or '\\'in n or p.as_posix()!=n:raise ValueError('Unsafe material path')
 return n

def archive_members(path,digest,wanted,output):
 if file_sha(path)!=digest:raise ValueError('Original archive hash mismatch')
 observed={};result={};manifest=None;total=0
 with tarfile.open(path,'r|gz')as t:
  for e in t:
   safe(e.name)
   if not e.isreg() or e.name in observed or len(observed)>=20000:raise ValueError('Invalid archive membership')
   total+=e.size
   if e.size>256*1024*1024 or total>1024*1024*1024:raise ValueError('Archive byte budget')
   stream=t.extractfile(e);h=hashlib.sha256();data=bytearray()if e.name in wanted or e.name=='source-manifest.json'else None
   for b in iter(lambda:stream.read(1024*1024),b''):
    h.update(b)
    if data is not None:data.extend(b)
   observed[e.name]=h.hexdigest()
   if e.name=='source-manifest.json':manifest=json.loads(data)
   if e.name in wanted:
    p=output/e.name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);result[e.name]=p
 if manifest:
  observed.pop('source-manifest.json')
  if observed!=manifest['files']:raise ValueError('Original source manifest differs from archive')
 if set(result)!=set(wanted):raise ValueError('Missing exact original archive materials')
 return result

def portable_private_record(record):
 x=copy.deepcopy(record);x.pop('sdk',None)
 for tool in x.get('sharedTools',{}).values():
  if isinstance(tool,dict):tool.pop('path',None)
 return x

def verify_groups(engine,read,runtime_files):
 if set(engine.get('nativeGroups',{}))!={'pthread','private-playback'}:raise ValueError('Incomplete native groups')
 for ident,group in engine['nativeGroups'].items():
  raw=read(group['recordInput']);manifest_bytes=read(group['sourceManifestInput'])
  if sha(raw)!=group['recordSHA256'] or sha(manifest_bytes)!=group['sourceManifestSHA256']:raise ValueError('Original record or manifest substitution')
  native=json.loads(raw);manifest=json.loads(manifest_bytes)
  for kind,prefix in [('inputs','demuxe/'),('configurations','build-materials/'),('sdkSources','toolchain/emscripten/')]:
   for original,namespaced in group['maps'][kind].items():
    expected=native[kind][original]
    if engine[kind].get(namespaced)!=expected or manifest['files'].get(prefix+original)!=expected:raise ValueError('Original preferred mapping mismatch')
  for original,namespaced in group['maps']['sources'].items():
   expected=native['sources'][original]
   if engine['sources'].get(namespaced)!=expected or manifest['files'].get('demuxe/build/downloads/'+original+'.tar.gz')!=expected:raise ValueError('Original upstream mapping mismatch')
  if ident=='pthread':
   required=set(native['artifacts'])
   if manifest['files'].get('engine-build.json')!=sha(raw):raise ValueError('Pthread record ancestry mismatch')
  else:
   required={f'web/engine-mpv-playback-{rt}/{name}'for rt in['jspi','asyncify']for name in['player.mjs','player.wasm','manifest.json']}
   source_build_bytes=read(group['sourceBuildInput'])
   if sha(source_build_bytes)!=group['sourceBuildSHA256'] or manifest['files'].get('build-materials/build/beta-build.json')!=sha(source_build_bytes):raise ValueError('Private source-build ancestry mismatch')
   if portable_private_record(json.loads(source_build_bytes))!=native:raise ValueError('Unreviewed source/runtime record transform')
   verify_private_mpv_release(runtime_files,native)
   roots={f'web/engine-mpv-playback-{rt}'for rt in['jspi','asyncify']}
   for kind in['sources','sdkSources']:
    if set(group['maps'][kind])!=set(native[kind]):raise ValueError('Incomplete private upstream/toolchain map')
   for kind in['inputs','configurations']:
    exact=set().union(*(set(native['privateMpv'][root][kind])for root in roots))
    if set(group['maps'][kind])!=exact:raise ValueError('Incomplete private preferred source set')
  for field in['artifacts','runtimeFiles']:
   names=group[field]
   if not isinstance(names,list)or len(names)!=len(set(names))or set(names)!=required:raise ValueError('Native artifact membership mismatch')
  for name in required:
   fact=native['artifacts'].get(name)
   if not fact or name not in runtime_files or sha(runtime_files[name])!=fact['sha256']or engine['artifacts'].get(name)!=fact:raise ValueError('Runtime differs from original native artifact')
  if ident=='pthread':
   excluded={'build/link-maps/subtitles.map','build/subtitle-service/link-command.json','build/subtitle-service/manifest.json'}
   if set(group.get('excludedConfigurations',[]))!=excluded or set(manifest.get('excludedConfigurations',[]))!=excluded:raise ValueError('Unreviewed pthread exclusion')
   if any(set(group['maps'][kind])!=(set(native[kind])-excluded if kind=='configurations'else set(native[kind]))for kind in['inputs','configurations','sources','sdkSources']):raise ValueError('Incomplete pthread preferred map')
 return True

def assemble(a):
 out=a.output;out.mkdir(parents=True,exist_ok=False)
 oldbytes=(a.pthread_payload/'engine-build.json').read_bytes();old=json.loads(oldbytes)
 runtime_names={f'package/web/engine-mpv-playback-{rt}/{name}'for rt in['jspi','asyncify']for name in['player.mjs','player.wasm','manifest.json']}
 runtime=archive_members(a.private_runtime,a.private_runtime_sha256,runtime_names|{'package/engine-build.json'},out/'private-runtime')
 privatebytes=runtime['package/engine-build.json'].read_bytes();private=json.loads(privatebytes)
 engine=copy.deepcopy(old);engine.update({kind:{}for kind in['inputs','configurations','sdkSources','sources','artifacts']});engine['nativeGroups']={};recovered={};sdk={};runtime_files={}
 for ident,native,raw,archive,digest in [('pthread',old,oldbytes,a.pthread_source,a.pthread_source_sha256),('private-playback',private,privatebytes,a.private_source,a.private_source_sha256)]:
  names={kind:set(native[kind])for kind in['inputs','configurations','sdkSources','sources']}
  excluded={'build/link-maps/subtitles.map','build/subtitle-service/link-command.json','build/subtitle-service/manifest.json'}if ident=='pthread'else set()
  names['configurations']-=excluded
  if ident=='private-playback':
   for kind in['inputs','configurations']:names[kind]=set().union(*(set(native['privateMpv'][f'web/engine-mpv-playback-{rt}'][kind])for rt in['jspi','asyncify']))
  wanted={'source-manifest.json'}|{'demuxe/'+n for n in names['inputs']}|{'build-materials/'+n for n in names['configurations']}|{'toolchain/emscripten/'+n for n in names['sdkSources']}|{'demuxe/build/downloads/'+n+'.tar.gz'for n in names['sources']}
  if ident=='private-playback':wanted.add('build-materials/build/beta-build.json')
  materials=archive_members(archive,digest,wanted,out/'materials'/ident);maps={kind:{}for kind in names}
  for kind,prefix,keyprefix in [('inputs','demuxe/',''),('configurations','build-materials/','build-materials/'),('sources','demuxe/build/downloads/','build/downloads/'),('sdkSources','toolchain/emscripten/','toolchain/emscripten/')]:
   for name in sorted(names[kind]):
    ns=f'native-groups/{ident}/{name}'if kind!='sdkSources'else name
    if kind=='sdkSources' and name in sdk:
     if sdk[name]!=native[kind][name]:raise ValueError('SDK collision')
    if kind=='sdkSources':sdk[name]=native[kind][name]
    member=prefix+name+('.tar.gz'if kind=='sources'else'');path=materials[member]
    if file_sha(path)!=native[kind][name]:raise ValueError('Preferred source bytes mismatch')
    engine[kind][ns]=native[kind][name];maps[kind][name]=ns;recovered[keyprefix+ns+('.tar.gz'if kind=='sources'else'')]=str(path.resolve())
  record_name=f'native-groups/{ident}/original-engine-build.json';p=out/record_name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw);engine['inputs'][record_name]=sha(raw);recovered[record_name]=str(p.resolve())
  manifest_name=f'native-groups/{ident}/original-source-manifest.json';mp=materials['source-manifest.json'];engine['inputs'][manifest_name]=file_sha(mp);recovered[manifest_name]=str(mp.resolve())
  artifacts=set(old['artifacts'])if ident=='pthread'else{n.removeprefix('package/')for n in runtime_names}
  group={'recordInput':record_name,'recordSHA256':sha(raw),'sourceManifestInput':manifest_name,'sourceManifestSHA256':file_sha(mp),'sourceArchiveSHA256':digest,'maps':maps,'artifacts':sorted(artifacts),'runtimeFiles':sorted(artifacts),'excludedConfigurations':sorted(excluded)}
  if ident=='private-playback':
   key='native-groups/private-playback/original-source-build.json';p=materials['build-materials/build/beta-build.json'];engine['inputs'][key]=file_sha(p);recovered[key]=str(p.resolve());group.update(sourceBuildInput=key,sourceBuildSHA256=file_sha(p))
  for name in artifacts:
   data=(a.pthread_payload/'runtime'/name).read_bytes()if ident=='pthread'else runtime['package/'+name].read_bytes();runtime_files[name]=data;engine['artifacts'][name]=native['artifacts'][name]
  engine['nativeGroups'][ident]=group
 verify_groups(engine,lambda name:pathlib.Path(recovered[name]).read_bytes(),runtime_files)
 (out/'engine-build.json').write_bytes(encoded(engine));(out/'recovered.json').write_bytes(encoded({'recovered':recovered}));print(json.dumps({'engineBuildSHA256':file_sha(out/'engine-build.json'),'inputs':len(engine['inputs']),'configurations':len(engine['configurations']),'sdkSources':len(engine['sdkSources']),'artifacts':len(engine['artifacts'])},indent=2))
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__)
 for n in['pthread-payload','pthread-source','private-runtime','private-source','output']:p.add_argument('--'+n,type=pathlib.Path,required=True)
 for n in['pthread-source-sha256','private-runtime-sha256','private-source-sha256']:p.add_argument('--'+n,required=True)
 assemble(p.parse_args())
