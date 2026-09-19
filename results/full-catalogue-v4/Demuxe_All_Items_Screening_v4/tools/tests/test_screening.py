"""Bookkeeping tests only: no Demuxe build, media decode or playback is executed."""
import copy
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest

PACKAGE = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('screening', PACKAGE/'tools/screening.py')
s = importlib.util.module_from_spec(spec)
spec.loader.exec_module(s)

class ScreeningTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)/'package'
        shutil.copytree(PACKAGE,self.root,ignore=shutil.ignore_patterns('__pycache__','*.docx'))
        self.items = s.load(self.root)
        self.item = s.resolve(self.items,'R343')
        (self.root/'evidence/test-audit.md').write_text('Synthetic utility-test audit; not a media test.\n')
    def tearDown(self):
        self.tmp.cleanup()
    def record(self):
        d=s.template(self.item)
        d.update(decision='DEFER_SETUP',evidence_level='SOURCE_REVIEW',source_checked=True,
                 tested_profile='Utility test profile; no actual playback.',
                 requested_output_contract='No media output; only ledger validation.',
                 reason='This is a synthetic source-audit decision used only by the test.',
                 reopen_condition='Reopen only after the missing fixture capability is supplied.',
                 evidence=[{'path':'evidence/test-audit.md','note':'Synthetic bookkeeping control.'}])
        return d
    def test_01_coverage_and_sources_verify(self):
        v=s.verify(self.root);self.assertTrue(v['ok'],v['errors']);self.assertEqual(v['legacy_ids'],366)
        self.assertEqual(v['named_records'],392);self.assertEqual(v['records'],425)
    def test_02_ambiguous_number_rejected(self):
        with self.assertRaisesRegex(ValueError,'Ambiguous'):s.resolve(self.items,'R242')
    def test_03_unique_number_resolves(self):
        self.assertEqual(s.resolve(self.items,'R343')['legacy_number'],343)
    def test_04_imports_excluded_from_fresh_lane(self):
        fresh={i['legacy_number'] for i in s.queue(self.root)}
        self.assertNotIn(74,fresh);self.assertNotIn(27,fresh)
        self.assertEqual(len(s.queue(self.root,'import')),7)
    def test_05_missing_source_lane(self):
        q=s.queue(self.root,'source');self.assertEqual(len(q),33);self.assertTrue(all(not i['title'] for i in q))
    def test_06_evidence_digest_populated(self):
        d=self.record();s.validate_record(self.root,self.items,d)
        self.assertEqual(d['evidence'][0]['sha256'],s.digest(self.root/'evidence/test-audit.md'))
    def test_07_wrong_source_digest_rejected(self):
        d=self.record();d['source_sha256']='0'*64
        with self.assertRaisesRegex(ValueError,'Source digest'):s.validate_record(self.root,self.items,d)
    def test_08_missing_evidence_rejected(self):
        d=self.record();d['evidence'][0]['path']='evidence/does-not-exist.md'
        with self.assertRaisesRegex(ValueError,'Evidence file missing'):s.validate_record(self.root,self.items,d)
    def test_09_wrong_evidence_digest_rejected(self):
        d=self.record();d['evidence'][0]['sha256']='0'*64
        with self.assertRaisesRegex(ValueError,'Evidence digest mismatch'):s.validate_record(self.root,self.items,d)
    def test_10_traversal_and_absolute_paths_rejected(self):
        for p in ['../outside','/tmp/outside']:
            with self.subTest(p=p),self.assertRaises(ValueError):s.safe_path(self.root,p)
    def test_11_symlink_escape_rejected(self):
        outside=Path(self.tmp.name)/'outside.txt';outside.write_text('external')
        (self.root/'evidence/link.txt').symlink_to(outside)
        with self.assertRaisesRegex(ValueError,'escapes'):s.safe_path(self.root,'evidence/link.txt')
    def test_12_runtime_claim_requires_execution(self):
        d=self.record();d['evidence_level']='REAL_PATH_SCREEN'
        with self.assertRaisesRegex(ValueError,'observed candidate'):s.validate_record(self.root,self.items,d)
    def test_13_silent_fallback_rejected(self):
        d=self.record();d['evidence_level']='REAL_PATH_SCREEN';d['candidate'].update(executed=True,silent_fallback=True)
        with self.assertRaisesRegex(ValueError,'silently fall back'):s.validate_record(self.root,self.items,d)
    def test_14_missing_scope_rejected(self):
        d=self.record();d['tested_profile']=None
        with self.assertRaisesRegex(ValueError,'tested_profile'):s.validate_record(self.root,self.items,d)
    def test_15_advance_requires_next_test(self):
        d=self.record();d['decision']='ADVANCE_CONFIRMATION'
        with self.assertRaisesRegex(ValueError,'bounded next test'):s.validate_record(self.root,self.items,d)
    def test_16_self_duplicate_rejected(self):
        d=self.record();d.update(decision='DUPLICATE',duplicate_of=self.item['key'])
        with self.assertRaisesRegex(ValueError,'itself'):s.validate_record(self.root,self.items,d)
    def test_17_missing_definition_cannot_pass(self):
        missing=s.resolve(self.items,'R76');d=self.record();d['key']=missing['key']
        with self.assertRaisesRegex(ValueError,'missing definition'):s.validate_record(self.root,self.items,d)
    def test_18_source_gate_can_be_recorded(self):
        missing=s.resolve(self.items,'R76');d=self.record();d.update(key=missing['key'],source_sha256=None,decision='HOLD_SOURCE',source_checked=False)
        s.validate_record(self.root,self.items,d);s.append(self.root,'state/decisions.jsonl',d)
        self.assertEqual(len(s.queue(self.root,'source')),32)
    def test_19_record_removes_from_first_pass(self):
        d=self.record();s.validate_record(self.root,self.items,d);s.append(self.root,'state/decisions.jsonl',d)
        self.assertNotIn(d['key'],{x['key'] for x in s.queue(self.root)})
    def test_20_evidence_mutation_detected(self):
        d=self.record();s.validate_record(self.root,self.items,d);s.append(self.root,'state/decisions.jsonl',d)
        (self.root/'evidence/test-audit.md').write_text('changed')
        self.assertFalse(s.verify(self.root)['ok'])
    def test_21_changed_source_rejected_on_record(self):
        d=self.record();p=self.root/self.item['definition_source']['path'];p.write_text(p.read_text()+'\nchanged')
        with self.assertRaisesRegex(ValueError,'source bytes changed'):s.validate_record(self.root,self.items,d)
    def test_22_budget_escalation_required(self):
        for field,n in [('candidate_revisions',3),('new_fixture_count',2)]:
            d=self.record();d['effort'][field]=n
            with self.subTest(field=field),self.assertRaisesRegex(ValueError,'budget'):s.validate_record(self.root,self.items,d)
    def test_23_existing_writer_lock_rejected(self):
        (self.root/'state/.ledger.lock').mkdir()
        with self.assertRaisesRegex(ValueError,'locked'):s.append(self.root,'state/decisions.jsonl',self.record())
    def test_24_malformed_ledger_not_silently_ignored(self):
        (self.root/'state/decisions.jsonl').write_text('{bad json}\n')
        with self.assertRaisesRegex(ValueError,'invalid JSON'):s.latest(self.root)
    def test_25_explicit_reopen_returns_to_pool(self):
        item=s.resolve(self.items,'R74');d=s.template(item)
        d.update(decision='REOPEN',evidence_level='NONE',reason='A new source profile now changes the relevant cost fraction.',reopen_condition='A new source profile now changes the relevant cost fraction.')
        s.validate_record(self.root,self.items,d);s.append(self.root,'state/decisions.jsonl',d)
        self.assertIn(item['key'],{i['key'] for i in s.queue(self.root)})
    def test_26_untouched_item_cannot_reopen(self):
        d=self.record();d['decision']='REOPEN'
        with self.assertRaisesRegex(ValueError,'untouched'):s.validate_record(self.root,self.items,d)
    def test_27_priority_update_changes_effective_order(self):
        s.append(self.root,'state/priority_updates.jsonl',{'key':self.item['key'],'impact':1,'screen_effort':'E3','qualification_burden':'Q4','target_relevance':'specialty-or-prepared','reason':'A changed measured workload reduces present relevance.'})
        item=next(i for i in s.effective_items(self.root) if i['key']==self.item['key'])
        self.assertEqual(item['priority_band'],5)
    def test_28_native_report_hashes_match(self):
        expected={'R239-R246-report.md':'c1c8624957347a393ab1a531d368e9c676286cb5aa8aa4a3c14d616c32f2aa5a','R268-R275-report.md':'e745e617985ff8fadbe4c1bbb5d1db451aeb08ba1f378ba1a7d6398c4a13d37c'}
        for name,h in expected.items():self.assertEqual(s.digest(self.root/'sources/reports'/name),h)

if __name__=='__main__':unittest.main(verbosity=2)
