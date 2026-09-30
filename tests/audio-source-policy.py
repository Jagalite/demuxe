#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Native source attribution gates; no native build or production asset writes."""
import contextlib, hashlib, importlib.util, io, json, pathlib, runpy, sys, tempfile, unittest
from unittest.mock import patch
ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'scripts'))
import audio_source_policy as policy
import license_policy

def load(name, filename):
    spec=importlib.util.spec_from_file_location(name, ROOT/'scripts'/filename)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
prepare=load('prepare_audio_source_test','prepare-provider-package.py')
audit=load('audit_audio_source_test','audit-provider-package.py')
sha=lambda data:hashlib.sha256(data).hexdigest()

class AudioSourcePolicy(unittest.TestCase):
    def test_bsd_profile_requires_only_the_exact_opus_pin(self):
        opus=policy.pinned_audio_source('opus-encoder')
        policy.verify_audio_build_source('opus-encoder', {'profile':'opus-encoder','source':opus})
        policy.verify_audio_engine_source('audio-opus-encoder', {'sources':{'opus-audio':opus['sha256']}})
        wrong=[{'ffmpeg-adaptation':policy.pinned_audio_source('aac')['sha256']},
               {'opus-audio':'0'*64}, {'opus-audio':opus['sha256'],'ffmpeg-adaptation':'1'*64}]
        for sources in wrong:
            with self.subTest(sources=sources), self.assertRaisesRegex(ValueError,'pinned native source'):
                policy.verify_audio_engine_source('audio-opus-encoder',{'sources':sources})

    def test_wrong_source_rejected_at_prepare_and_audit_entry(self):
        engine={'sources':{'ffmpeg-adaptation':policy.pinned_audio_source('aac')['sha256']}}
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);native=root/'engine.json';native.write_text(json.dumps(engine))
            companion=root/'companion.json';companion.write_text('{}')
            with patch.object(prepare.subprocess,'check_output') as compile_call:
                with self.assertRaisesRegex(ValueError,'pinned native source'):
                    prepare.assemble('audio-opus-encoder',native,companion,root/'package')
                compile_call.assert_not_called()
            self.assertFalse((root/'package').exists())
        with self.assertRaisesRegex(ValueError,'pinned native source'):
            audit.audit('audio-opus-encoder',{}, {'engineBuildRecord':engine})

    def record(self, profiles, wrong_opus):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp).resolve();(root/'scripts').mkdir()
            (root/'scripts/audio_source_policy.py').write_bytes((ROOT/'scripts/audio_source_policy.py').read_bytes())
            archive=root/'source.tar.gz';archive.write_bytes(b'fixture upstream source')
            active='ffmpeg-adaptation' if wrong_opus else 'opus-audio'
            pins=[{'name':name,'sha256':sha(archive.read_bytes()) if name==active else '0'*64} for name in ['ffmpeg-adaptation','opus-audio']]
            (root/'sources.lock.json').write_text(json.dumps({'sources':pins}))
            builds=root/'builds';builds.mkdir();runtime=b'fixture wasm bytes'
            for profile in profiles:
                directory=builds/profile;directory.mkdir();(directory/'module.wasm').write_bytes(runtime);(directory/'config.h').write_bytes(b'fixture config')
                record={'source':next(p for p in pins if p['name']==active),'sourceKey':'fixture','profile':profile,'inputs':{},'effectiveConfig':{'config.h':sha(b'fixture config')},'artifacts':{'module.wasm':{'sha256':sha(runtime),'bytes':len(runtime)}}}
                raw=json.dumps(record).encode();(directory/'build-record.json').write_bytes(raw)
                (builds/(profile+'.json')).write_text(json.dumps({'directory':str(directory),'recordSHA256':sha(raw)}))
            sdk=root/'sdk.json';sdk.write_text(json.dumps({'sdk':str(root/'sdk'),'sdkSources':{}}))
            argv=['record-audio-provider-build.py','--builds',str(builds),'--sdk-record',str(sdk),'--source-archive',str(archive),'--output',str(root/'provenance'),'--profiles',*profiles]
            with patch.object(license_policy,'ROOT',root), patch.object(policy,'ROOT',root),patch.object(sys,'argv',argv),contextlib.redirect_stdout(io.StringIO()):
                if wrong_opus:
                    with self.assertRaisesRegex(ValueError,'pinned native source'):
                        runpy.run_path(str(ROOT/'scripts/record-audio-provider-build.py'),run_name='__main__')
                    self.assertFalse((root/'web').exists(),'earlier valid profile wrote runtime before later invalid profile rejection')
                else:
                    runpy.run_path(str(ROOT/'scripts/record-audio-provider-build.py'),run_name='__main__')
                    self.assertEqual((root/'web/providers/audio/opus-encoder/module.wasm').read_bytes(),runtime)
                    engine=json.loads((root/'provenance/engine-build.json').read_bytes())
                    self.assertEqual(engine['sources'],{'opus-audio':sha(archive.read_bytes())})
                    self.assertIn('scripts/audio_source_policy.py',engine['inputs'])

    def test_all_profile_sources_checked_before_first_runtime_write(self):
        self.record(['ac3','opus-encoder'],True)

    def test_correct_pinned_libopus_record_is_accepted(self):
        self.record(['opus-encoder'],False)

if __name__=='__main__':unittest.main()
