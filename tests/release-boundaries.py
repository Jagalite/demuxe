#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
import copy
import json
from pathlib import Path
import subprocess
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'scripts'))
from release_boundaries import CASES, HARNESS, verify_boundary_receipt

class Boundaries(unittest.TestCase):
    def test_scenarios_match_live_runner(self):
        names=json.loads(subprocess.check_output(['node','--input-type=module','-e',
            "import {liveBoundaryCases as a} from './tests/api-stability/live-boundary-scenarios.mjs';import {liveNetworkCases as b} from './tests/api-stability/live-network-scenarios.mjs';console.log(JSON.stringify([...a,...b]))"],text=True))
        self.assertEqual(set(names),CASES)
        self.assertEqual(len(names),len(CASES))

    def test_exact_archive_and_complete_checks_required(self):
        assets=['web/range-reader.js','web/generated/sources.js','web/generated/preview/providers.js',
                'web/generated/internal/machine/async-policy.js','web/generated/internal/machine/preview.js']
        manifest={'sourceCommit':'commit','files':{n:{'sha256':'asset','bytes':1} for n in assets}}
        source={'demuxe/'+n:'source' for n in HARNESS|{'scripts/serve.mjs','fixtures/example.mp4'}}
        receipt={'passed':True,'negativeControl':False,'scope':'Installed-archive live boundary checks',
                 'family':'webkit','browser':'26','archiveSHA256':'archive','sourceCommit':'commit',
                 'runtimeFiles':manifest['files'],'checks':[{'scenario':n,'passed':True,'errors':[]} for n in CASES],
                 'hashes':{**{n:'asset' for n in assets},**{n[7:]:'source' for n in source}},
                 'servedHashes':{n:'asset' for n in assets}}
        verify_boundary_receipt(receipt,'webkit','archive',manifest,source)
        for key,value in [('passed',False),('negativeControl',True),('archiveSHA256','old'),
                          ('family','chromium'),('sourceCommit','old'),('runtimeFiles',{}),
                          ('checks',receipt['checks'][:-1]),('hashes',{}),('servedHashes',{})]:
            bad=copy.deepcopy(receipt);bad[key]=value
            with self.subTest(key=key),self.assertRaises(ValueError):
                verify_boundary_receipt(bad,'webkit','archive',manifest,source)
        for change in ['duplicate','error','failed']:
            bad=copy.deepcopy(receipt)
            if change=='duplicate':bad['checks'][-1]=bad['checks'][0]
            elif change=='error':bad['checks'][0]['errors']=['Page crashed']
            else:bad['checks'][0]['passed']=False
            with self.subTest(change=change),self.assertRaises(ValueError):
                verify_boundary_receipt(bad,'webkit','archive',manifest,source)

if __name__=='__main__':unittest.main()
