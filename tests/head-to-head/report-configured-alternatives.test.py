# SPDX-License-Identifier: Apache-2.0
import hashlib
import json
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest

REPORTER = Path(__file__).with_name('report-configured-alternatives.py')

class ReportTests(unittest.TestCase):
    def test_screen_pass_is_distinct_and_failed_cleanup_never_becomes_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            run = root / 'run'
            (run / 'files/harness').mkdir(parents=True)
            cases = [
                dict(id='movi.default.sample', fixture='sample', player='movi', lane='default', status='failed', screenPassed=True, initialPlaybackPassed=True, failureStage='cleanup'),
                dict(id='movi.native-first.sample', fixture='sample', player='movi', lane='native-first', status='blocked', screenPassed=True),
                dict(id='libmedia.file-input.sample', fixture='sample', player='libmedia', lane='file-input', status='failed', initialPlaybackPassed=True, failureStage='near-eof'),
                dict(id='libmedia.webcodecs-off.sample', fixture='sample', player='libmedia', lane='webcodecs-off', status='passed'),
            ]
            summary = dict(kind='correctness', finishedAt='2026-09-21', cases=cases, selected=[c['id'] for c in cases])
            (run/'summary.json').write_text(json.dumps(summary))
            (run/'files/harness/matrix.json').write_text(json.dumps({'fixtures':{'sample':{'label':'Sample'}}}))
            (run/'manifest.json').write_text(json.dumps({'sha256':{str(p.relative_to(run)):hashlib.sha256(p.read_bytes()).hexdigest() for p in run.rglob('*') if p.is_file()}}))
            output = root/'report'
            subprocess.run([sys.executable, str(REPORTER), '--output', str(output), str(run)], check=True, capture_output=True)
            data = json.loads((output/'summary.json').read_text())
            self.assertEqual(data['counts']['movi.default'], {'failed':1})
            self.assertEqual(data['counts']['movi.native-first'], {'Pass*':1})
            self.assertEqual(data['fixtures']['sample']['results']['movi.default']['outcome'], 'Plays; fails cleanup')
            self.assertEqual(data['counts']['libmedia.file-input'], {'failed':1})
            self.assertEqual(data['counts']['libmedia.webcodecs-off'], {'Pass':1})
            self.assertIn('Full File input', (output/'REPORT.md').read_text())
            self.assertIn('Plays; fails near-eof', (output/'REPORT.md').read_text())
            corrected = root/'corrected'
            shutil.copytree(run, corrected)
            updated = json.loads((corrected/'summary.json').read_text())
            updated['cases'] = [{**cases[0], 'status':'passed', 'screenPassed':False}]
            updated['selected'] = [cases[0]['id']]
            (corrected/'summary.json').write_text(json.dumps(updated))
            (corrected/'manifest.json').write_text(json.dumps({'sha256':{str(p.relative_to(corrected)):hashlib.sha256(p.read_bytes()).hexdigest() for p in corrected.rglob('*') if p.is_file() and p.name!='manifest.json'}}))
            subprocess.run([sys.executable,str(REPORTER),'--output',str(root/'revised'),'--supersede',str(corrected),str(run)],check=True,capture_output=True)
            revised=json.loads((root/'revised/summary.json').read_text())
            item=revised['fixtures']['sample']['results']['movi.default']
            self.assertEqual(item['outcome'],'Pass')
            self.assertEqual(item['supersedes']['outcome'],'Plays; fails cleanup')
            (run/'summary.json').write_text('{}')
            changed = subprocess.run([sys.executable,str(REPORTER),'--output',str(root/'changed'),str(run)],capture_output=True)
            self.assertNotEqual(changed.returncode,0)
            self.assertIn(b'Changed evidence',changed.stderr)

if __name__ == '__main__':
    unittest.main()
