# SPDX-License-Identifier: Apache-2.0
import importlib.util,pathlib,unittest,copy,tempfile,json
p=pathlib.Path(__file__).with_name('report-refresh-row.py');spec=importlib.util.spec_from_file_location('refresh',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Reporting(unittest.TestCase):
 def test_only_exact_pcm_ass_label_alias_is_accepted(self):
  m.validate_label('pcm-ass','H.264 + PCM24 / MKV + external ASS','H.264 + PCM24 / MKV + ASS')
  for values in [('other','H.264 + PCM24 / MKV + external ASS','H.264 + PCM24 / MKV + ASS'),('pcm-ass','H.264 + PCM24 / MKV + external ASS extra','H.264 + PCM24 / MKV + ASS')]:
   with self.assertRaises(AssertionError):m.validate_label(*values)
 def proof(self):
  return {'kind':'correctness','assetsSHA256':'assets','harnessSHA256':'captured','browserIdentity':'Chrome153/headed','cases':[{'id':'demuxe.auto.file','fixture':'file','player':'demuxe','lane':'auto','status':'passed'}]}
 def cpu(self):
  return {'kind':'performance','assetsSHA256':'assets','harnessSHA256':'captured','browserIdentity':'Chrome153/headed','cases':[{'id':'demuxe.auto.file','round':r,'status':'passed','measurement':{'oneCorePercent':v}} for r,v in [(1,10),(2,12),(3,11)]]}
 def test_cpu_must_match_captured_harness_and_complete_rounds(self):
  selected=m.selected_cases([self.proof()]);cpu=self.cpu();self.assertEqual(m.cpu_cells(selected,[cpu])['demuxe.auto.file']['medianOneCorePercent'],11)
  for key in ['harnessSHA256','assetsSHA256','browserIdentity']:
   wrong=copy.deepcopy(cpu);wrong[key]='different'
   with self.assertRaises(AssertionError):m.cpu_cells(selected,[wrong])
  wrong=copy.deepcopy(cpu);wrong['cases'][2]['round']=2
  with self.assertRaises(AssertionError):m.cpu_cells(selected,[wrong])
 def test_unknown_or_duplicate_lanes_do_not_silently_pass(self):
  proof=self.proof();proof['cases'][0]['lane']='future-private'
  with self.assertRaises(AssertionError):m.selected_cases([proof])
  with self.assertRaises(AssertionError):m.selected_cases([self.proof(),self.proof()])
 def test_unqualified_browser_preflight_preserves_failure_without_cpu_value(self):
  selected=m.selected_cases([self.proof()]);cpu=self.cpu();del cpu['browserIdentity']
  cpu['browserBlocks']=[{'status':'failed','arms':0,'startupReadiness':{'status':'failed','traceStopped':True,'completedTask':None}}]
  for r in cpu['cases']:
   r.update(status='failed',failureStage='setup',reason='Startup readiness unconfirmed\nstack trace');del r['measurement']
  result=m.cpu_cells(selected,[cpu])['demuxe.auto.file']
  self.assertEqual(result['status'],'withheld');self.assertNotIn('medianOneCorePercent',result)
  self.assertEqual(result['reasons'],['Startup readiness unconfirmed']*3)
  self.assertIn('CPU withheld: Startup readiness unconfirmed',m.route_reason({'route':'software','reason':'Correctness passed','cpu':result}))
  for mutation in ['accepted','measurement','samples','stage','assets','browser','initial','screenMeasured','caseBrowser','blocks','arms','task','trace','readiness']:
   wrong=copy.deepcopy(cpu);r=wrong['cases'][0]
   if mutation=='accepted':r.update(status='passed',measurement={'oneCorePercent':10})
   elif mutation=='measurement':r['measurement']={'oneCorePercent':10}
   elif mutation=='samples':r['samples']=[{'state':{}}]
   elif mutation=='stage':r['failureStage']='presentation-cadence'
   elif mutation=='assets':wrong['assetsSHA256']='different'
   elif mutation=='browser':wrong['browserIdentity']='different'
   elif mutation in ['initial','screenMeasured']:r[mutation]=True
   elif mutation=='caseBrowser':r['browserIdentity']='Chrome'
   elif mutation=='blocks':wrong['browserBlocks']=[]
   elif mutation=='arms':wrong['browserBlocks'][0]['arms']=1
   elif mutation=='task':wrong['browserBlocks'][0]['startupReadiness']['completedTask']={'name':'finished'}
   elif mutation=='readiness':wrong['browserBlocks'][0]['startupReadiness']['status']='passed'
   else:wrong['browserBlocks'][0]['startupReadiness']['traceStopped']=False
   with self.assertRaises(AssertionError):m.cpu_cells(selected,[wrong])
 def test_multitrack_cpu_names_only_the_measured_initial_track(self):
  proof=self.proof();case=proof['cases'][0];track={'id':'audio:1','codec':'aac'}
  case.update(initial={'selectedAudioTrack':track},audioTrackTransitions=[{'requestedCodec':'ac3','route':'native-transcode'},{'requestedCodec':'aac','route':'native-direct'}])
  cpu=self.cpu()
  for r in cpu['cases']:r['samples']=[{'state':{'selectedAudioTrack':track,'route':'native-direct'}}]
  selected=m.selected_cases([proof]);result=m.cpu_cells(selected,[cpu])[case['id']]
  self.assertIn('initial AAC',m.cell(case,result));self.assertEqual(result['sampleRoutes'],['native-direct'])
  detail=m.route_reason({'route':'native-direct','reason':'Passed','audioTrackTransitions':case['audioTrackTransitions'],'cpu':result})
  self.assertIn('AC3 via native-transcode',detail);self.assertIn('AAC via native-direct',detail);self.assertIn('CPU measures initial AAC only',detail)
  for replacement in [None,{'id':'audio:2','codec':'ac3'},{}]:
   wrong=copy.deepcopy(cpu);wrong['cases'][0]['samples'][0]['state']['selectedAudioTrack']=replacement
   with self.assertRaises(AssertionError):m.cpu_cells(selected,[wrong])
  wrong=copy.deepcopy(cpu);wrong['cases'][0]['samples']=[]
  with self.assertRaises(AssertionError):m.cpu_cells(selected,[wrong])
 def test_failed_or_missing_cpu_never_publishes_a_number(self):
  selected=m.selected_cases([self.proof()]);self.assertEqual(m.cpu_cells(selected,[])['demuxe.auto.file']['status'],'pending')
  cpu=self.cpu();cpu['cases'][1]['status']='failed';cpu['cases'][1]['reason']='Foreground lost'
  cpu['cases'][0]['reason']='Accepted measurement';cpu['cases'][2]['reason']='Another accepted measurement'
  withheld=m.cpu_cells(selected,[cpu])['demuxe.auto.file'];self.assertEqual(withheld['status'],'withheld');self.assertNotIn('medianOneCorePercent',withheld)
  self.assertEqual(withheld['reasons'],['Foreground lost'])
  detail=m.route_reason({'route':'native-transcode','reason':'Correctness passed','cpu':withheld})
  self.assertIn('CPU withheld: Foreground lost',detail);self.assertNotIn('Accepted measurement',detail)
  incomplete=self.cpu();incomplete['cases']=incomplete['cases'][:2]
  result=m.cpu_cells(selected,[incomplete])['demuxe.auto.file']
  self.assertEqual(result['reasons'],['Incomplete CPU rounds: 2 accepted; at least 3 required'])
  proof=self.proof();proof['cases'][0]['status']='failed'
  with self.assertRaises(AssertionError):m.cpu_cells(m.selected_cases([proof]),[self.cpu()])
 def test_supplemental_audit_must_bind_selected_summary_record_and_samples(self):
  with tempfile.TemporaryDirectory() as temporary:
   directory=pathlib.Path(temporary);record=directory/'case.json';record.write_text('{}');summary=directory/'summary.json';summary.write_text('{}')
   proof=self.proof();case=proof['cases'][0];case.update(recordPath='case.json',rateSamples=[{'position':1},{'position':3.5}])
   audit={'passed':True,'summaries':[{'path':str(summary),'sha256':m.digest(summary.read_bytes())}],'cases':[{'path':str(record),'sha256':m.digest(record.read_bytes()),'id':case['id'],'samples':case['rateSamples'],'accepted':True}]}
   m.validate_audit(audit,[directory],[proof])
   for kind in ['summary','record','samples']:
    wrong=copy.deepcopy(audit)
    if kind=='summary':wrong['summaries'][0]['sha256']='unrelated'
    elif kind=='record':wrong['cases'][0]['sha256']='unrelated'
    else:wrong['cases'][0]['samples']=[]
    with self.assertRaises(AssertionError):m.validate_audit(wrong,[directory],[proof])
if __name__=='__main__':unittest.main()
