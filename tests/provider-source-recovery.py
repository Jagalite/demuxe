#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Corresponding source can move; original native input bytes cannot change."""
import contextlib, hashlib, importlib.util, io, json, sys, tarfile, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('provider_source',ROOT/'scripts/package-provider-source.py')
source=importlib.util.module_from_spec(spec);spec.loader.exec_module(source)
sha=lambda data:hashlib.sha256(data).hexdigest()

class SourceRecoveryTests(unittest.TestCase):
 def fixture(self,root):
  (root/'licensing').mkdir();(root/'licensing/provider-packages.json').write_text(json.dumps({'profiles':{'fixture':{'excludedSourceConfigurations':[]}}}))
  contents={'src/native.c':b'original native source','build-materials/build/link.txt':b'original link flags','build/downloads/decoder.tar.gz':b'original download','toolchain/emscripten/emcc.py':b'original compiler'}
  recovered={}
  for index,(name,data)in enumerate(contents.items()):
   path=root/'relocated'/str(index);path.parent.mkdir(exist_ok=True);path.write_bytes(data);recovered[name]=str(path)
  record={'inputs':{'src/native.c':sha(contents['src/native.c'])},'configurations':{'build/link.txt':sha(contents['build-materials/build/link.txt'])},'sources':{'decoder':sha(contents['build/downloads/decoder.tar.gz'])},'sdkSources':{'emcc.py':sha(contents['toolchain/emscripten/emcc.py'])},'sdk':'/original-unavailable-ci-sdk','qualification':'unchanged original record'}
  record_path=root/'engine.json';record_path.write_text(json.dumps(record));mapping=root/'recovered.json';mapping.write_text(json.dumps({'recovered':recovered}))
  return record,record_path,mapping,recovered,contents
 def assemble(self,root,record,mapping):
  output=root/'source.tar.gz'
  with patch.object(source,'ROOT',root),patch.object(source,'application_source_paths',return_value=set()),contextlib.redirect_stdout(io.StringIO()):source.assemble(record,mapping,root/'old-build',output,'fixture')
  return output
 def test_single_build_relocation_retains_original_record_and_all_input_hashes(self):
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);record,record_path,mapping,recovered,contents=self.fixture(root);original=record_path.read_bytes();output=self.assemble(root,record_path,mapping)
   with tarfile.open(output)as archive:
    self.assertEqual(archive.extractfile('engine-build.json').read(),original)
    manifest=json.load(archive.extractfile('source-manifest.json'))
    self.assertEqual(manifest['engineBuildSHA256'],sha(original))
    for name,data in contents.items():
     member='demuxe/'+name if name.startswith(('src/','build/downloads/'))else name
     self.assertEqual(archive.extractfile(member).read(),data);self.assertEqual(manifest['files'][member],sha(data))
   self.assertEqual(record_path.read_bytes(),original)
 def test_changed_recovered_inputs_are_rejected_even_with_valid_original_fallback(self):
  for selected in ['src/native.c','build-materials/build/link.txt','build/downloads/decoder.tar.gz','toolchain/emscripten/emcc.py']:
   with self.subTest(selected=selected),tempfile.TemporaryDirectory()as tmp:
    root=Path(tmp);record,record_path,mapping,recovered,contents=self.fixture(root)
    for name,data in contents.items():
     if name.startswith('build-materials/'):fallback=root/'old-build'/name.removeprefix('build-materials/')
     elif name.startswith('build/downloads/'):fallback=root/'old-build'/name
     elif name.startswith('toolchain/'):fallback=root/'sdk/upstream/emscripten'/name.removeprefix('toolchain/emscripten/')
     else:continue
     fallback.parent.mkdir(parents=True,exist_ok=True);fallback.write_bytes(data)
    record['sdk']=str(root/'sdk');record_path.write_text(json.dumps(record));Path(recovered[selected]).write_bytes(b'changed bytes')
    with self.assertRaisesRegex(ValueError,'Source hash mismatch'):self.assemble(root,record_path,mapping)
    self.assertFalse((root/'source.tar.gz').exists())
 def test_legacy_single_build_locations_remain_supported(self):
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);record,record_path,mapping,recovered,contents=self.fixture(root)
   for name,data in contents.items():
    if name.startswith('build-materials/'):destination=root/'old-build'/name.removeprefix('build-materials/')
    elif name.startswith('build/downloads/'):destination=root/'old-build'/name
    elif name.startswith('toolchain/'):destination=root/'sdk/upstream/emscripten'/name.removeprefix('toolchain/emscripten/')
    else:continue
    destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(data)
   record['sdk']=str(root/'sdk');record_path.write_text(json.dumps(record));mapping.write_text(json.dumps({'recovered':{'src/native.c':recovered['src/native.c']}}))
   self.assertTrue(self.assemble(root,record_path,mapping).is_file())
 def test_composite_records_still_require_explicit_recovered_paths(self):
  with tempfile.TemporaryDirectory()as tmp:
   root=Path(tmp);record,record_path,mapping,recovered,contents=self.fixture(root);record['nativeGroups']={'fixture':{}};record_path.write_text(json.dumps(record));del recovered['build-materials/build/link.txt'];mapping.write_text(json.dumps({'recovered':recovered}))
   fallback=root/'old-build/build/link.txt';fallback.parent.mkdir(parents=True);fallback.write_bytes(contents['build-materials/build/link.txt'])
   with self.assertRaises(KeyError):self.assemble(root,record_path,mapping)

if __name__=='__main__':unittest.main()
