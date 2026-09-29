# SPDX-License-Identifier: Apache-2.0
import copy
import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest
spec=importlib.util.spec_from_file_location('optional_release',pathlib.Path(__file__).resolve().parents[1]/'scripts/optional_release.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ReleaseEvidence(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name)
  self.archive=self.root/'package.tgz';self.archive.write_bytes(b'exact archive')
  self.report=self.root/'qualification.json';self.source={'demuxe/tests/qualified.mjs':'harness-hash'}
  self.manifest={'files':{'web/engine-subtitles/service.wasm':{'sha256':'wasm-hash','bytes':7}}}
  self.record={'passed':True,'archiveSHA256':module.digest(self.archive),'runtimeFiles':self.manifest['files'],'checks':[]}
  for name in sorted(module.OPTIONAL_CHECKS):
   log=self.root/(name+'.log');log.write_text('PASS\n')
   self.record['checks'].append({'name':name,'passed':True,'exitCode':0,'log':log.name,'sha256':module.digest(log),'harnesses':{'tests/qualified.mjs':'harness-hash'}})
 def tearDown(self):self.temp.cleanup()
 def verify(self):
  self.report.write_text(json.dumps(self.record));return module.verify(self.report,self.archive,self.manifest,self.source)
 def test_standard_consumer_matrix_matches_shipped_assets(self):
  base=module.required_consumer_cases({'files':{}})
  self.assertEqual(len(base),17)
  self.assertNotIn('native-external-ass',base)
  self.assertEqual(module.required_consumer_cases(self.manifest),base|{'native-external-ass'})
 def test_private_runtime_consumer_matrix(self):
  base=module.required_consumer_cases({'files':{}})
  manifest={'files':{'web/engine-remux-jspi/remux.wasm':{}}}
  self.assertEqual(module.required_consumer_cases(manifest)-base, {'remux-auto-isolated','remux-auto-no-isolation','remux-asyncify-no-isolation','remux-on-isolated','remux-off-no-isolation'})
 def test_complete_exact_evidence(self):self.assertEqual(self.verify()['checks'],len(module.OPTIONAL_CHECKS))
 def test_wrong_archive(self):
  self.archive.write_bytes(b'other')
  with self.assertRaisesRegex(ValueError,'different archive'):self.verify()
 def test_missing_browser_case(self):
  self.record['checks'].pop()
  with self.assertRaisesRegex(ValueError,'Incomplete'):self.verify()
 def test_migration_checks_are_mandatory(self):
  for name in ['presentation-chrome','presentation-firefox','external-subtitles-chrome','external-subtitles-firefox']:
   with self.subTest(name=name):
    saved=copy.deepcopy(self.record)
    self.assertIn(name,module.OPTIONAL_CHECKS)
    self.record['checks']=[c for c in self.record['checks'] if c['name']!=name]
    with self.assertRaisesRegex(ValueError,'Incomplete'):self.verify()
    self.record=saved
 def test_duplicate_case(self):
  self.record['checks'][-1]=self.record['checks'][0]
  with self.assertRaisesRegex(ValueError,'Incomplete'):self.verify()
 def test_changed_runtime(self):
  self.record['runtimeFiles']={}
  with self.assertRaisesRegex(ValueError,'inventory'):self.verify()
 def test_changed_harness(self):
  self.source['demuxe/tests/qualified.mjs']='different'
  with self.assertRaisesRegex(ValueError,'harness differs'):self.verify()
 def test_changed_log(self):
  (self.root/self.record['checks'][0]['log']).write_text('edited')
  with self.assertRaisesRegex(ValueError,'log changed'):self.verify()
 def test_failed_check(self):
  self.record['checks'][0]['exitCode']=1
  with self.assertRaisesRegex(ValueError,'Failed'):self.verify()
if __name__=='__main__':unittest.main()
