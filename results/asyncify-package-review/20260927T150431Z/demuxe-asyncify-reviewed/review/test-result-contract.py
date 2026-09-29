#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
import copy,json,pathlib,sys,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from result_contract import validate_result
def good(suite='units'):
 r={'name':'fixture','testBackend':'asyncify','crossOriginIsolated':False,
 'sharedArrayBufferAvailable':False,'memoryType':'ArrayBuffer','nestedWorkersCreated':0,
 'jspiSuspendingAvailable':False,'jspiPromisingAvailable':False,'ok':True}
 r['stats' if suite=='units' else 'scheduler']={'continuations':{'kind':'asyncify'},
 'liveTasks':0,'retainedTasks':0,'waitKeys':0,'timers':0,'freeSlots':24,'abandoned':0,'created':3,'completed':3}
 if suite=='range':r.update(source={'handles':0,'pending':0,'timers':0},cLiveCookies=0)
 return r
class Contract(unittest.TestCase):
 def valid(self,r,suite='units',negative=False):
  return validate_result('asyncify',suite,negative,'fixture',r)[0]
 def test_positive_unit(self):self.assertTrue(self.valid(good()))
 def test_positive_range(self):self.assertTrue(self.valid(good('range'),'range'))
 def test_missing_scheduler(self):
  r=good();del r['stats'];self.assertFalse(self.valid(r))
 def test_wrong_actual_backend(self):
  r=good();r['stats']['continuations']['kind']='jspi';self.assertFalse(self.valid(r))
 def test_one_JSPI_API_still_present(self):
  r=good();r['jspiSuspendingAvailable']=True;self.assertFalse(self.valid(r))
 def test_missing_JSPI_evidence(self):
  r=good();del r['jspiPromisingAvailable'];self.assertFalse(self.valid(r))
 def test_missing_memory_evidence(self):
  r=good();del r['memoryType'];self.assertFalse(self.valid(r))
 def test_source_leak_rejected(self):
  r=good('range');r['source']['pending']=1;self.assertFalse(self.valid(r,'range'))
 def test_missing_source_stats_rejected(self):
  r=good('range');del r['source'];self.assertFalse(self.valid(r,'range'))
 def test_abandon_not_completion(self):
  r=good();r['stats']['abandoned']=1;self.assertFalse(self.valid(r))
 def test_wrong_negative_error(self):
  r=good();r.update(ok=False,error='watchdog timeout');self.assertFalse(self.valid(r,negative=True))
 def test_negative_still_requires_runtime_evidence(self):
  r=good();r.update(ok=False,error='C assertion');del r['stats'];self.assertFalse(self.valid(r,negative=True))
 def test_expected_negative(self):
  r=good();r.update(ok=False,error='C assertion: stack integrity');self.assertTrue(self.valid(r,negative=True))
 def test_missing_worker_count(self):
  r=good();del r['nestedWorkersCreated'];self.assertFalse(self.valid(r))
 def test_wrong_case(self):
  r=good();r['name']='other';self.assertFalse(self.valid(r))
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Contract))
 (ROOT/'results/review-contracts.json').write_text(json.dumps({'scope':'Host result validation tests','tests':result.testsRun,
 'failures':len(result.failures),'errors':len(result.errors)},indent=2)+'\n')
 sys.exit(not result.wasSuccessful())
