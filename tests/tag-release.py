#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Release orchestration guards; no builds, uploads or npm publication."""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / (name + '.py'))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


pipeline = module('tag-release')
publisher = module('publish-github-release')


class ReleaseGuards(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def test_release_catalogue_is_dynamic_correctness_without_cpu(self):
        baseline=self.root/'baseline-assets';candidate=self.root/'candidate-assets'
        with patch.object(pipeline,'WORK',self.root), patch.object(pipeline,'run',side_effect=self.catalogue_report) as run:
            pipeline.run_catalogue_correctness(baseline,candidate)
        self.assertEqual(run.call_count,2)
        for call,assets in zip(run.call_args_list,[baseline,candidate]):
            self.assertEqual(call.args[0],['node','tests/head-to-head/run.mjs','--assets',assets,
                '--output',self.root/('baseline' if assets==baseline else 'candidate'),
                '--catalogue','--cases','demuxe'])

    def catalogue_report(self, argv, status='passed', mutate=None, code=None):
        snapshot=Path(argv[argv.index('--assets')+1]);output=Path(argv[argv.index('--output')+1])
        (snapshot/'fixtures').mkdir(parents=True,exist_ok=True)
        (snapshot/'fixtures/catalogue.json').write_text('{"fixture":{}}')
        output.mkdir()
        summary={'kind':'correctness','assets':str(snapshot),'finishedAt':'2026-10-06T00:00:00Z',
                 'selected':['demuxe.auto.fixture'],'cases':[{'id':'demuxe.auto.fixture','status':status}],
                 'counts':{s:int(s==status) for s in ['passed','failed','blocked','skipped']},'passed':status=='passed'}
        if mutate:mutate(summary)
        (output/'summary.json').write_text(json.dumps(summary))
        (output/'manifest.json').write_text(json.dumps({'sha256':{'summary.json':pipeline.digest(output/'summary.json')}}))
        code=(0 if status=='passed' else 1) if code is None else code
        if code:raise subprocess.CalledProcessError(code,argv)

    def test_completed_limitations_reach_both_lanes(self):
        def result(argv):self.catalogue_report(argv,status='blocked' if argv[argv.index('--output')+1].name=='baseline' else 'failed')
        with patch.object(pipeline,'WORK',self.root),patch.object(pipeline,'run',side_effect=result) as run:
            pipeline.run_catalogue_correctness(self.root/'old',self.root/'new')
        self.assertEqual(run.call_count,2)

    def test_catalogue_crash_without_final_report_stops(self):
        with patch.object(pipeline,'WORK',self.root),patch.object(pipeline,'run',side_effect=subprocess.CalledProcessError(1,['node'])) as run:
            with self.assertRaises(FileNotFoundError):pipeline.run_catalogue_correctness(self.root/'old',self.root/'new')
        self.assertEqual(run.call_count,1)

    def test_catalogue_signal_is_not_a_completed_failure(self):
        for code in [-9,2]:
            with self.subTest(code=code),patch.object(pipeline,'WORK',self.root),patch.object(pipeline,'run',side_effect=subprocess.CalledProcessError(code,['node'])) as run:
                with self.assertRaises(subprocess.CalledProcessError):pipeline.run_catalogue_correctness(self.root/'old',self.root/'new')
            self.assertEqual(run.call_count,1)

    def test_catalogue_stale_output_is_rejected_before_launch(self):
        (self.root/'baseline').mkdir()
        with patch.object(pipeline,'WORK',self.root),patch.object(pipeline,'run') as run:
            with self.assertRaisesRegex(ValueError,'fresh'):pipeline.run_catalogue_correctness(self.root/'old',self.root/'new')
        run.assert_not_called()

    def test_catalogue_incomplete_or_inconsistent_receipts_stop(self):
        mutations=[lambda s:s.pop('finishedAt'),lambda s:s.update(cases=[]),
                   lambda s:s['cases'].append(s['cases'][0]),lambda s:s.update(selected=[]),
                   lambda s:s.update(counts={}),lambda s:s.update(passed=True),
                   lambda s:s.update(assets=str(self.root/'wrong')),
                   lambda s:s['cases'][0].update(status='skipped')]
        for i,mutate in enumerate(mutations):
            with self.subTest(i=i):
                work=self.root/str(i);work.mkdir()
                def result(argv):self.catalogue_report(argv,status='blocked',mutate=mutate)
                with patch.object(pipeline,'WORK',work),patch.object(pipeline,'run',side_effect=result) as run:
                    with self.assertRaisesRegex(ValueError,'Incomplete'):pipeline.run_catalogue_correctness(work/'old',work/'new')
                self.assertEqual(run.call_count,1)

    def test_catalogue_exit_status_must_match_report(self):
        def result(argv):self.catalogue_report(argv,status='blocked',code=0)
        with patch.object(pipeline,'WORK',self.root),patch.object(pipeline,'run',side_effect=result):
            with self.assertRaisesRegex(ValueError,'inconsistent'):pipeline.run_catalogue_correctness(self.root/'old',self.root/'new')

    def test_catalogue_changed_final_report_is_rejected(self):
        def result(argv):
            self.catalogue_report(argv)
            summary=Path(argv[argv.index('--output')+1])/'summary.json'
            summary.write_text(summary.read_text()+'\n')
        with patch.object(pipeline,'WORK',self.root),patch.object(pipeline,'run',side_effect=result):
            with self.assertRaisesRegex(ValueError,'Incomplete'):pipeline.run_catalogue_correctness(self.root/'old',self.root/'new')

    def test_catalogue_missing_completion_manifest_stops(self):
        def result(argv):
            self.catalogue_report(argv)
            (Path(argv[argv.index('--output')+1])/'manifest.json').unlink()
        with patch.object(pipeline,'WORK',self.root),patch.object(pipeline,'run',side_effect=result):
            with self.assertRaises(FileNotFoundError):pipeline.run_catalogue_correctness(self.root/'old',self.root/'new')

    def test_catalogue_skipped_cases_never_reach_comparison(self):
        def result(argv):self.catalogue_report(argv,status='skipped')
        with patch.object(pipeline,'WORK',self.root),patch.object(pipeline,'run',side_effect=result):
            with self.assertRaisesRegex(ValueError,'Incomplete'):pipeline.run_catalogue_correctness(self.root/'old',self.root/'new')

    def test_unsafe_archives_rejected_before_extraction(self):
        for name, kind in [('../escape', tarfile.REGTYPE), ('absolute/link', tarfile.SYMTYPE)]:
            archive = self.root / 'input.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                entry = tarfile.TarInfo(name); entry.type = kind
                tar.addfile(entry, io.BytesIO(b''))
            with self.assertRaises(ValueError):
                pipeline.unpack(archive, self.root / 'output')
            self.assertFalse((self.root / 'output').exists())

    def test_changed_baseline_never_extracted(self):
        with patch.object(pipeline, 'WORK', self.root), patch.object(pipeline.urllib.request, 'urlopen', return_value=io.BytesIO(b'wrong bytes')), patch.object(pipeline, 'unpack') as unpack:
            with self.assertRaisesRegex(ValueError, 'baseline SHA-256'):
                pipeline.fetch_baseline()
            unpack.assert_not_called()

    def test_stale_result_cannot_count_as_new_qualification(self):
        (self.root / 'result.json').write_text('{}')
        with patch.object(pipeline, 'ROOT', self.root), patch.object(pipeline, 'run'):
            with self.assertRaisesRegex(ValueError, 'one fresh result'):
                pipeline.result_after('suite.mjs', 'result.json', {})

    def test_fixture_failure_stops_before_verification(self):
        with patch.object(pipeline, 'run', side_effect=subprocess.CalledProcessError(1, ['fixture'])) as run:
            with self.assertRaises(subprocess.CalledProcessError):
                pipeline.qualify('v0.3.0-beta.4')
            run.assert_called_once_with(['python3', 'scripts/prepare-release-fixtures.py'])

    def test_tagged_package_builds_required_preparation_profiles(self):
        with patch.dict(pipeline.os.environ, {'DEMUXE_SDK': str(self.root / 'sdk')}), \
             patch.object(pipeline, 'run') as run, \
             patch.object(pipeline, 'adaptation', return_value=self.root / 'engine'):
            pipeline.package('v0.3.0-beta.4-rc.17')
        build, package = [call.args[0] for call in run.call_args_list]
        self.assertEqual(build[:2], ['python3', 'scripts/build-audio-adaptation.py'])
        self.assertIn('--transcode', build)
        self.assertIn('--opus', build)
        self.assertEqual(package[:2], ['python3', 'scripts/package-beta.py'])
        self.assertIn('--release-tag', package)
        self.assertIn('--adaptation-build', package)
        self.assertIn('--with-shaka', package)

    def test_unqualified_archive_never_creates_release(self):
        with patch.object(publisher.verify, 'validate', side_effect=ValueError('unqualified')), patch.object(publisher, 'gh') as gh:
            with self.assertRaises(ValueError):
                publisher.publish(self.root, 'tag', 'commit', 'owner/repo')
            gh.assert_not_called()

    def test_release_only_published_after_all_uploads(self):
        (self.root / 'runtime.tgz').write_bytes(b'archive')
        (self.root / 'source.tar.gz').write_bytes(b'source')
        with patch.object(publisher.verify, 'validate'), patch.object(publisher, 'gh', side_effect=['[[]]', '', '{"isDraft":true,"assets":[]}', '', '', '']) as gh:
            publisher.publish(self.root, 'tag', 'commit', 'owner/repo')
            calls = [c.args for c in gh.call_args_list]
            self.assertEqual(calls[1][:2], ('release', 'create'))
            self.assertIn('--draft', calls[1])
            self.assertEqual([c[1] for c in calls[3:]], ['upload', 'upload', 'edit'])
            self.assertIn('--draft=false', calls[-1])

    def test_failed_upload_leaves_release_draft(self):
        (self.root / 'runtime.tgz').write_bytes(b'archive')
        error = subprocess.CalledProcessError(1, ['gh', 'release', 'upload'])
        with patch.object(publisher.verify, 'validate'), patch.object(publisher, 'gh', side_effect=['[[]]', '', '{"isDraft":true,"assets":[]}', error]) as gh:
            with self.assertRaises(subprocess.CalledProcessError):
                publisher.publish(self.root, 'tag', 'commit', 'owner/repo')
            self.assertFalse(any(c.args[:2] == ('release', 'edit') for c in gh.call_args_list))

    def test_published_release_cannot_gain_missing_assets(self):
        (self.root / 'runtime.tgz').write_bytes(b'archive')
        with patch.object(publisher.verify, 'validate'), patch.object(publisher, 'gh', side_effect=['[[{"tag_name":"tag"}]]', '{"isDraft":false,"assets":[]}']) as gh:
            with self.assertRaisesRegex(ValueError, 'refusing to modify'):
                publisher.publish(self.root, 'tag', 'commit', 'owner/repo')
            self.assertEqual(gh.call_count, 2)


if __name__ == '__main__':
    unittest.main()
