#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
import ast,importlib.util,json,pathlib,py_compile,sys,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('profiles',ROOT/'ffmpeg/scripts/suspension_profile.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Profiles(unittest.TestCase):
 def test_jspi_only(self):
  flags=m.suspension_flags('jspi',['rm_open','rm_step']);self.assertIn('-sJSPI=1',flags);self.assertFalse(any('ASYNCIFY' in f for f in flags))
 def test_asyncify_only(self):
  flags=m.suspension_flags('asyncify',['rm_open']);self.assertIn('-sASYNCIFY=1',flags);self.assertFalse(any('JSPI' in f for f in flags))
 def test_indirect_callbacks_preserved(self):self.assertIn('-sASYNCIFY_IGNORE_INDIRECT=0',m.suspension_flags('asyncify',['rm_open']))
 def test_private_memory_flags(self):self.assertFalse(any('pthread' in f or 'SHARED_MEMORY' in f for f in m.suspension_flags('asyncify',['rm_open'])))
 def test_unknown_backend(self):
  with self.assertRaises(ValueError):m.suspension_flags('auto',['rm_open'])
 def test_stack_alignment(self):
  with self.assertRaises(ValueError):m.suspension_flags('asyncify',['rm_open'],4097)
 def test_stack_lower_bound(self):
  with self.assertRaises(ValueError):m.suspension_flags('asyncify',['rm_open'],128)
 def test_stack_upper_bound(self):
  with self.assertRaises(ValueError):m.suspension_flags('asyncify',['rm_open'],2**31)
 def test_bool_not_budget(self):
  with self.assertRaises(ValueError):m.suspension_flags('asyncify',['rm_open'],True)
 def test_export_allowlist(self):
  with self.assertRaises(ValueError):m.suspension_flags('jspi',['malloc'])
 def test_wildcards_rejected(self):
  with self.assertRaises(ValueError):m.suspension_flags('jspi',['rm_*'])
 def test_unknown_rm_export_rejected(self):
  with self.assertRaises(ValueError):m.suspension_flags('jspi',['rm_unreviewed'])
 def test_duplicate_exports_rejected(self):
  with self.assertRaises(ValueError):m.suspension_flags('jspi',['rm_open','rm_open'])
 def test_string_export_container_rejected(self):
  with self.assertRaises(ValueError):m.suspension_flags('jspi','rm_open')
 def test_bool_export_rejected(self):
  with self.assertRaises(ValueError):m.suspension_flags('asyncify',[True])
 def test_common_read_import(self):
  text=(ROOT/'ffmpeg/scripts/prepare-ffmpeg.py').read_text();tree=ast.parse(text)
  new=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(x,ast.Name) and x.id=='NEW' for x in n.targets))
  self.assertIn('EM_ASYNC_JS',new);self.assertNotIn('Suspending',new);self.assertNotIn('Atomics',new)
 def test_raw_source_does_not_require_JSPI(self):
  self.assertNotIn('WebAssembly.Suspending',(ROOT/'stage2/runtime/range-source.mjs').read_text())
if __name__=='__main__':
 suite=unittest.defaultTestLoader.loadTestsFromTestCase(Profiles);result=unittest.TextTestRunner(verbosity=2).run(suite)
 for f in ROOT.rglob('*.py'):py_compile.compile(str(f),doraise=True)
 record={'scope':'Host build-profile and source-contract guards, not Emscripten compile tests','tests':result.testsRun,'failures':len(result.failures),'errors':len(result.errors)}
 (ROOT/'results/profiles.json').write_text(json.dumps(record,indent=2)+'\n')
 sys.exit(not result.wasSuccessful())
