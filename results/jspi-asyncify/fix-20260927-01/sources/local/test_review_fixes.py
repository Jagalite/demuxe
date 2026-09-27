#!/usr/bin/env python3
"""Evidence and build-contract regressions; compiler calls are test doubles."""
import argparse,copy,importlib.util,json,pathlib,sys,tempfile,unittest
from unittest.mock import patch

EXP=pathlib.Path(__file__).resolve().parents[1]
ROOT=EXP.parents[1]
sys.path.insert(0,str(EXP/'ffmpeg/scripts'))
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
summary=module('summary',EXP/'local/summarize.py')
builder=module('builder',EXP/'ffmpeg/scripts/build-ffmpeg.py')
relink=module('relink',EXP/'ffmpeg/scripts/relink-ffmpeg.py')

class Matrix(unittest.TestCase):
    def setUp(self):
        self.record=json.loads((ROOT/'results/jspi-asyncify/media-remux-jspi-01/result.json').read_text())
    def validate(self):return summary.validate_campaign(self.record,'remux',['pthread','jspi'],'avc-aac.ts')
    def test_complete_historical_matrix(self):self.assertEqual(self.validate(),12)
    def test_replaced_cancellation(self):
        cases=self.record['cases'];replacement=copy.deepcopy(next(c for c in cases if c['scenario']=='reader-failure'))
        replacement['id']+='-repeat';cases[next(i for i,c in enumerate(cases) if c['scenario']=='cancel')]=replacement
        with self.assertRaisesRegex(ValueError,'identities'):self.validate()
    def test_forged_case_fields(self):
        self.record['cases'][0]['target']=99
        with self.assertRaisesRegex(ValueError,'fields'):self.validate()
    def test_missing_sources(self):
        del self.record['sourceSHA256']
        with self.assertRaisesRegex(ValueError,'snapshots'):self.validate()
    def test_wrong_fixture(self):
        self.record['cases'][0]['fixture']='ac3.mkv'
        with self.assertRaisesRegex(ValueError,'fixture'):self.validate()
    def test_wrong_pthread_isolation(self):
        self.record['cases'][0]['evidence']['runtimeFacts']['crossOriginIsolated']=False
        with self.assertRaisesRegex(ValueError,'isolation'):self.validate()
    def current_schema(self):
        # Upgrade the preserved fixture structurally; these are contract tests,
        # not a claim that historical runs recorded these response headers.
        self.record['schemaVersion']=2
        self.record['sourceSHA256']['ffmpeg/tests/frozen-inputs.mjs']='test hash'
        self.record['frozenSHA256']={'fixtures/avc-aac.ts':self.record['cases'][0]['sourceSHA256'],'fixtures/h264-pcm.mkv':'replacement hash'}
        for c in self.record['cases']:
            c['fixture']='avc-aac.ts';isolated=c['runtime']=='pthread'
            c['documentHeaders']={'coop':'same-origin' if isolated else None,'coep':'require-corp' if isolated else None}
            c['pageIsolation']={'crossOriginIsolated':isolated,'sharedArrayBufferAvailable':isolated}
            c['evidence']['runtimeFacts']['responseHeaders']={k:v for k,v in [('cross-origin-opener-policy',c['documentHeaders']['coop']),('cross-origin-embedder-policy',c['documentHeaders']['coep'])] if v}
            if c['scenario']=='replace':c.update(replacementFixture='h264-pcm.mkv',replacementSHA256='replacement hash')
    def test_current_schema(self):
        self.current_schema();self.assertEqual(self.validate(),12)
    def test_missing_pthread_coep(self):
        self.current_schema();self.record['cases'][0]['documentHeaders']['coep']=None
        with self.assertRaisesRegex(ValueError,'document COOP/COEP'):self.validate()
    def test_unexpected_private_coop(self):
        self.current_schema();self.record['cases'][1]['evidence']['runtimeFacts']['responseHeaders']['cross-origin-opener-policy']='same-origin'
        with self.assertRaisesRegex(ValueError,'worker COOP/COEP'):self.validate()
    def test_changed_replacement(self):
        self.current_schema();next(c for c in self.record['cases'] if c['scenario']=='replace')['replacementSHA256']='changed'
        with self.assertRaisesRegex(ValueError,'replacement'):self.validate()

class BuildProvenance(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.base=pathlib.Path(self.temp.name);self.source=self.base/'prepared';self.source.mkdir()
        self.sdk=self.base/'sdk'
        for name in ['clang','wasm-opt']:
            p=self.sdk/'upstream/bin'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'test tool')
        for name in ['native/remux/remux.c','native/adaptation/flac.h','audit-wasm.mjs','suspension_profile.py','build-ffmpeg.py']:
            p=self.source/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'test source')
        (self.source/'inputs.json').write_text(json.dumps({'profile':'transcode','suspension':'jspi'}))
        def run(argv,**kwargs):
            if argv[0]=='make':
                for lib in ['libavformat','libavcodec','libswresample','libavutil']:
                    p=self.source/'objects'/lib/(lib+'.a');p.parent.mkdir(parents=True);p.write_bytes(b'original archive')
                for name in ['config.h','config_components.h']:(self.source/'objects'/name).write_text('test config')
            if argv[0]=='emcc':
                p=pathlib.Path(argv[argv.index('-o')+1]);p.write_bytes(b'glue');p.with_suffix('.wasm').write_bytes(b'wasm')
            return argparse.Namespace(returncode=0)
        self.run=run
        self.versions=lambda argv,**kwargs:'emcc 4.0.14\n' if str(argv[0]).endswith('emcc') else 'test-version\n'
        with patch.object(builder,'__file__',str(self.source/'build-ffmpeg.py')),patch.object(builder.subprocess,'run',run),patch.object(builder.subprocess,'check_output',self.versions):
            builder.main(argparse.Namespace(sdk=self.sdk,jobs=1,saved_stack_bytes=65536))
        self.record=json.loads((self.source/'build-result.json').read_text())
    def test_builder_records_reusable_inputs(self):
        self.assertEqual(len(self.record['relinkInputsSHA256']),6)
        self.assertEqual(relink.verify_relink_inputs(self.source,self.record),self.record['linkCommand'])
    def test_changed_archive(self):
        (self.source/'objects/libavcodec/libavcodec.a').write_bytes(b'changed archive')
        with self.assertRaisesRegex(ValueError,'Changed original relink input'):relink.verify_relink_inputs(self.source,self.record)
    def test_changed_commands(self):
        with (self.source/'commands.json').open('a') as f:f.write(' ')
        with self.assertRaisesRegex(ValueError,'Changed original build commands'):relink.verify_relink_inputs(self.source,self.record)
    def test_missing_archive_hash(self):
        self.record['relinkInputsSHA256'].pop('objects/libavcodec/libavcodec.a')
        with self.assertRaisesRegex(ValueError,'Incomplete'):relink.verify_relink_inputs(self.source,self.record)
    def test_legacy_build_rejected(self):
        del self.record['relinkInputsSHA256']
        with self.assertRaisesRegex(ValueError,'fresh build'):relink.verify_relink_inputs(self.source,self.record)
    def test_relink_records_observed_toolchain(self):
        out=self.base/'relinked'
        with patch.object(relink.subprocess,'run',self.run),patch.object(relink.subprocess,'check_output',self.versions):
            relink.main(argparse.Namespace(build=self.source,out=out,flac_level=0))
        result=json.loads((out/'build-result.json').read_text())
        self.assertEqual(result['status'],'build_completed_only');self.assertEqual(result['toolchain'],self.record['toolchain'])
    def test_toolchain_drift_rejected_before_link(self):
        (self.sdk/'upstream/bin/clang').write_bytes(b'changed tool')
        with patch.object(relink.subprocess,'run') as compiler,patch.object(relink.subprocess,'check_output',self.versions):
            with self.assertRaisesRegex(ValueError,'toolchain differs'):
                relink.main(argparse.Namespace(build=self.source,out=self.base/'relinked',flac_level=0))
            compiler.assert_not_called()
    def test_archive_changes_during_toolchain_probe(self):
        def versions(argv,**kwargs):
            (self.source/'objects/libavcodec/libavcodec.a').write_bytes(b'changed after preflight')
            return self.versions(argv,**kwargs)
        with patch.object(relink.subprocess,'run') as compiler,patch.object(relink.subprocess,'check_output',versions):
            with self.assertRaisesRegex(ValueError,'changed after preflight'):
                relink.main(argparse.Namespace(build=self.source,out=self.base/'relinked',flac_level=0))
            compiler.assert_not_called()

if __name__=='__main__':unittest.main()
