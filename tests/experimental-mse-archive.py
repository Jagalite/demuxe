# SPDX-License-Identifier: Apache-2.0
"""Create an explicitly dirty diagnostic archive; never a publishable release."""
import hashlib,json,tarfile,io,pathlib
base=pathlib.Path('build/release/demuxe-1.1.1.tgz');output=base.with_name('demuxe-1.1.1-mse-owner-experiment.tgz')
sha=lambda data:hashlib.sha256(data).hexdigest()
assert sha(base.read_bytes())=='e767f0c71b175a97a1074690bf24670537aeb58c766dd2e2cfad746b19c72fed'
patch=pathlib.Path('web/worker-remux-controller.js').read_bytes()
with tarfile.open(base) as original:
 manifest=json.load(original.extractfile('package/release-manifest.json'))
 assert manifest['sourceCommit']=='4b2222a18d25e6c24071bf24a2245dada36ce6ba'
 assert sha(original.extractfile('package/web/worker-remux-controller.js').read())==manifest['files']['web/worker-remux-controller.js']['sha256']
 manifest['files']['web/worker-remux-controller.js']={'sha256':sha(patch),'bytes':len(patch)}
 manifest.update(dirtySource=True,sourceTag=None,status='mse-owner-diagnostic-only',diagnosticPatch={'baseArchiveSHA256':sha(base.read_bytes()),'files':{'web/worker-remux-controller.js':sha(patch)}})
 with tarfile.open(output,'w:gz') as experiment:
  names=set()
  for member in original:
   path=pathlib.PurePosixPath(member.name)
   assert not path.is_absolute() and '..' not in path.parts and member.name not in names
   assert member.isfile() or member.isdir()
   names.add(member.name)
   if member.isdir():experiment.addfile(member);continue
   data=original.extractfile(member).read()
   if member.name=='package/web/worker-remux-controller.js':data=patch
   elif member.name=='package/release-manifest.json':data=(json.dumps(manifest,indent=2)+'\n').encode()
   member.size=len(data);experiment.addfile(member,io.BytesIO(data))
print(json.dumps({'baseArchiveSHA256':sha(base.read_bytes()),'experimentalArchiveSHA256':sha(output.read_bytes()),'controllerSHA256':sha(patch),'dirtySource':True,'publishable':False}))
