"""Source/output correspondence contracts, separate from playback qualification."""
import hashlib
import importlib.util
import json
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('verify', pathlib.Path(__file__).resolve().parents[1]/'scripts/verify-native-ass-build.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Correspondence(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = pathlib.Path(self.temp.name).resolve()
        self.library = self.base/'library'
        self.runtime = self.base/'runtime'
        self.runtime.mkdir()
        self.lib = self.library/'build/prefix/lib/libass.a'
        self.lib.parent.mkdir(parents=True)
        self.lib.write_bytes(b'archive')
        self.source = self.library/'build/sources/libass/ass.c'
        self.source.parent.mkdir(parents=True)
        self.source.write_bytes(b'source')
        sha = lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
        inputs = {n:{'name':n,'sha256':n} for n in ['freetype','fribidi','harfbuzz','libass']}
        self.record = {'schema':1,'archives':inputs,'files':{str(p.relative_to(self.library)):sha(p) for p in [self.lib,self.source]}}
        self.manifest = {'apiVersion':2,'sources':list(inputs.values()),'files':{str(self.lib):{'sha256':sha(self.lib)}}}
        for path in [self.runtime/'subtitles.mjs', self.runtime/'subtitles.wasm',
                     *[self.lib.parent/('lib'+n+'.a') for n in ['freetype','fribidi','harfbuzz']]]:
            path.write_bytes(b'fixture')
            self.manifest['files'][str(path)]={'sha256':sha(path)}
            if path.suffix=='.a':
                self.record['files'][str(path.relative_to(self.library))]=sha(path)
        self.save()
    def save(self):
        (self.library/'source-build.json').write_text(json.dumps(self.record))
        (self.runtime/'manifest.json').write_text(json.dumps(self.manifest))
    def test_matching_build_is_not_release_admission(self):
        result=module.verify(self.runtime)
        self.assertTrue(result['verified'])
        self.assertFalse(result['releaseQualified'])
    def test_changed_preferred_source_rejects(self):
        self.source.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'Source build hash mismatch'):
            module.verify(self.runtime)
    def test_replaced_archive_cannot_reuse_record(self):
        self.lib.write_bytes(b'other archive')
        self.manifest['files'][str(self.lib)]['sha256']=hashlib.sha256(self.lib.read_bytes()).hexdigest()
        self.save()
        with self.assertRaisesRegex(ValueError,'Source build hash mismatch'):
            module.verify(self.runtime)
    def test_lock_mismatch_rejects(self):
        self.manifest['sources'][0]['sha256']='different'
        # Detach the fixture's shared input objects before changing only runtime.
        self.record=json.loads((self.library/'source-build.json').read_text())
        self.save()
        with self.assertRaisesRegex(ValueError,'source locks differ'):
            module.verify(self.runtime)
    def test_path_escape_rejects(self):
        self.record['files']['../outside']='bad'
        self.save()
        with self.assertRaisesRegex(ValueError,'escapes'):
            module.verify(self.runtime)
    def test_changed_runtime_rejects(self):
        (self.runtime/'subtitles.wasm').write_bytes(b'other runtime')
        with self.assertRaisesRegex(ValueError,'Linked input/output hash mismatch'):
            module.verify(self.runtime)
    def test_missing_runtime_inventory_rejects(self):
        del self.manifest['files'][str(self.runtime/'subtitles.wasm')]
        self.save()
        with self.assertRaisesRegex(ValueError,'Incomplete linked'):
            module.verify(self.runtime)

if __name__ == '__main__':
    unittest.main()
