#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""The release flag must not bless dirty, unlicensed or mismatched build artifacts."""
import hashlib, json, pathlib, shutil, subprocess, tempfile, unittest
ROOT=pathlib.Path(__file__).resolve().parent.parent
class ReleaseGates(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(dir=ROOT/'build');self.root=pathlib.Path(self.tmp.name)
  (self.root/'scripts').mkdir()
  for name in ['package-beta.py','license_policy.py','private_remux_assets.py']:shutil.copy2(ROOT/'scripts'/name,self.root/'scripts'/name)
  subprocess.run(['git','init','-q',str(self.root)],check=True)
  self.write('package.json',{'version':'0.0.0-test'})
  self.write('.gitignore','/build/\n__pycache__/\n')
  self.commit()
 def tearDown(self):self.tmp.cleanup()
 def write(self,name,value):
  p=self.root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(value)if isinstance(value,dict)else value)
 def commit(self):
  subprocess.run(['git','add','.'],cwd=self.root,check=True)
  subprocess.run(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],cwd=self.root,check=True)
  subprocess.run(['git','tag','-f','candidate'],cwd=self.root,check=True,stdout=subprocess.DEVNULL)
 def run_gate(self,pattern):
  p=subprocess.run(['python3','scripts/package-beta.py','--release-tag','candidate',
                    '--adaptation-build',str(self.root/'missing-adaptation'),
                    '--ass-build',str(self.root/'missing-ass')],cwd=self.root,text=True,capture_output=True)
  self.assertNotEqual(p.returncode,0);self.assertIn(pattern,p.stderr)
 def test_dirty_tree(self):
  self.write('unreviewed.js','changed');self.run_gate('clean source checkout')
 def test_wrong_tag(self):
  self.write('new.js','new');subprocess.run(['git','add','.'],cwd=self.root,check=True)
  subprocess.run(['git','-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','new'],cwd=self.root,check=True)
  self.run_gate('Release tag must identify HEAD')
 def test_unlicensed_source(self):self.run_gate('original-code license')
 def licensed(self):
  self.write('package.json',{'version':'0.0.0-test','license':'Apache-2.0'});self.write('LICENSE','license fixture');self.commit()
 def test_incremental_build(self):
  self.licensed();self.write('build/beta-build.json',{'clean':False});self.run_gate('completed clean engine build')
 def test_clean_build_allows_worker_sources_but_rejects_old_outputs(self):
  shutil.copy2(ROOT/'scripts/beta-build-record.py',self.root/'scripts/beta-build-record.py')
  self.write('web/engine-worker.js','source code')
  (self.root/'build').mkdir()
  command=['python3','scripts/beta-build-record.py','start','--clean']
  result=subprocess.run(command,cwd=self.root,text=True,capture_output=True)
  self.assertEqual(result.returncode,0,result.stderr)
  self.assertTrue(json.loads((self.root/'build/beta-build-start.json').read_text())['clean'])
  self.write('build/cache/old.a','compiled cache')
  result=subprocess.run(command,cwd=self.root,text=True,capture_output=True)
  self.assertNotEqual(result.returncode,0);self.assertIn('build/cache',result.stderr)
 def test_packaging_only_edits_are_not_native_compiler_inputs(self):
  shutil.copy2(ROOT/'scripts/beta-build-record.py',self.root/'scripts/beta-build-record.py')
  self.write('scripts/generated-runtime-files.mjs','packaging helper')
  self.write('scripts/build-private-release.py','compiler recipe')
  (self.root/'build').mkdir()
  command=['python3','scripts/beta-build-record.py','start','--clean']
  subprocess.run(command,cwd=self.root,check=True,capture_output=True)
  before=json.loads((self.root/'build/beta-build-start.json').read_text())['inputs']
  self.assertNotIn('scripts/package-beta.py',before)
  self.assertNotIn('scripts/generated-runtime-files.mjs',before)
  self.assertIn('scripts/build-private-release.py',before)
  self.write('scripts/package-beta.py','changed packager')
  subprocess.run(command,cwd=self.root,check=True,capture_output=True)
  self.assertEqual(before,json.loads((self.root/'build/beta-build-start.json').read_text())['inputs'])
  self.write('scripts/build-private-release.py','changed compiler recipe')
  subprocess.run(command,cwd=self.root,check=True,capture_output=True)
  self.assertNotEqual(before,json.loads((self.root/'build/beta-build-start.json').read_text())['inputs'])
 def test_changed_binary(self):
  self.licensed()
  build={'clean':True,'sdk':str(self.root),'sdkSources':{},'sharedTools':{},'inputs':{},'configurations':{},'artifacts':{},'privateRemux':{}}
  # Keep the private runtime preconditions valid so this test reaches the
  # maintained engine's changed-binary gate, using the real collection helper.
  for group,name in [('inputs','scripts/package-beta.py'),('configurations','package.json')]:
   build[group][name]=hashlib.sha256((self.root/name).read_bytes()).hexdigest()
  for backend in ['jspi','asyncify']:
   for name,profile in [('remux','remux'),('adaptation','transcode')]:
    folder=f'web/engine-{name}-{backend}';files={}
    for filename in ['remux.mjs','remux.wasm']:
     asset=folder+'/'+filename;self.write(asset,'fixture '+asset)
     files[filename]=hashlib.sha256((self.root/asset).read_bytes()).hexdigest()
     build['artifacts'][asset]={'sha256':files[filename]}
    self.write(folder+'/manifest.json',{'schema':1,'backend':backend,'profile':profile,'files':files})
    build['privateRemux'][folder]={'inputs':list(build['inputs']),'configurations':list(build['configurations'])}
  for name in ['private-remux.js','private-ffmpeg/bridge.js','private-ffmpeg/range-source.js','private-ffmpeg/single-owner.js','private-ffmpeg/LICENSE.txt']:
   self.write('web/'+name,'fixture')
  self.commit()
  self.write('build/engine.wasm','changed')
  build['artifacts']['build/engine.wasm']={'sha256':hashlib.sha256(b'original').hexdigest()}
  self.write('build/beta-build.json',build)
  self.run_gate('Build record mismatch: build/engine.wasm')
if __name__=='__main__':unittest.main()
