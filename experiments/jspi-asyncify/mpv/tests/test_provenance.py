# SPDX-License-Identifier: MIT
import importlib.util,json,pathlib,tempfile,unittest
SCRIPT=pathlib.Path(__file__).resolve().parents[1]/'scripts/provenance.py'
spec=importlib.util.spec_from_file_location('provenance',SCRIPT);p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class ProvenanceTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.root=pathlib.Path(self.temp.name);self.deps=self.root/'deps';self.sdk=self.root/'sdk'
  for folder in p.LINK_ROOTS:(self.deps/folder).mkdir(parents=True)
  for name,text in [('sources/mpv/player/client.c','original'),('objects/mpv/config.h','config'),('prefix/include/mpv/client.h','header'),('prefix/lib/pkgconfig/mpv.pc','flags'),('prefix/lib/libmpv.a','archive'),('inputs/driver.py','driver')]:
   file=self.deps/name;file.parent.mkdir(parents=True,exist_ok=True);file.write_text(text)
  toolchain={}
  for key,rel in [('clangSHA256','upstream/bin/clang'),('wasmOptSHA256','upstream/bin/wasm-opt'),('emccSHA256','upstream/emscripten/emcc.py')]:
   f=self.sdk/rel;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(key);toolchain[key]=p.digest(f)
  self.record={'status':'built_dependencies_only','linkInputSHA256':p.link_inputs(self.deps),'archives':{'prefix/lib/libmpv.a':p.digest(self.deps/'prefix/lib/libmpv.a')},'toolchain':toolchain,'inputSHA256':{'inputs/driver.py':p.digest(self.deps/'inputs/driver.py')}};self.save()
 def save(self):(self.deps/'build-result.json').write_text(json.dumps(self.record))
 def test_valid(self):self.assertEqual(p.verify_dependencies(self.deps,self.sdk),self.record)
 def test_compiled_client_drift(self):
  (self.deps/'sources/mpv/player/client.c').write_text('changed');self.assertRaisesRegex(ValueError,'source/header',p.verify_dependencies,self.deps,self.sdk)
 def test_injected_header(self):
  (self.deps/'objects/mpv/client.h').write_text('shadow');self.assertRaisesRegex(ValueError,'source/header',p.verify_dependencies,self.deps,self.sdk)
 def test_archive_drift(self):
  (self.deps/'prefix/lib/libmpv.a').write_text('changed');self.assertRaisesRegex(ValueError,'archive',p.verify_dependencies,self.deps,self.sdk)
 def test_sdk_drift(self):
  (self.sdk/'upstream/emscripten/emcc.py').write_text('changed');self.assertRaisesRegex(ValueError,'SDK',p.verify_dependencies,self.deps,self.sdk)
 def test_legacy_record(self):
  del self.record['linkInputSHA256'];self.save();self.assertRaisesRegex(ValueError,'Legacy',p.verify_dependencies,self.deps,self.sdk)
if __name__=='__main__':unittest.main()
