#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Installed package deployment boundary regressions, independent of engines."""
import importlib.util,json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('deployment',ROOT/'scripts/deploy-providers.py');deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)

class DeploymentTests(unittest.TestCase):
    def fixture(self,root):
        core=root/'core';core.mkdir();(core/'package.json').write_text(json.dumps({'name':'demuxe','version':'1.0.0'}));(core/'license-map.json').write_text(json.dumps({'package.json':['Apache-2.0'],'license-map.json':['Apache-2.0']}))
        provider=root/'provider';(provider/'runtime').mkdir(parents=True);(provider/'runtime/engine.wasm').write_bytes(b'bytes')
        artifacts={'runtime/engine.wasm':deploy.sha(b'bytes')};identity='sha256:'+deploy.sha(deploy.encoded(artifacts))
        metadata={'name':'@demuxe/test','version':'1.0.0','peerDependencies':{'demuxe':'1.0.0'}}
        manifest={'providerContractVersion':1,'package':'@demuxe/test','version':'1.0.0','compatibleCore':'1.0.0','artifacts':artifacts,'assets':[{'id':'engine','path':'engine.wasm','bytes':5,'sha256':deploy.sha(b'bytes'),'dependencies':[]}],'provides':[{'id':'test','implementationIdentity':identity,'assetIds':['engine']}]}
        (provider/'package.json').write_text(json.dumps(metadata));(provider/'provider-manifest.json').write_text(json.dumps(manifest));return core,provider,manifest
    def test_core_only_and_explicit_provider(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve();core,provider,_=self.fixture(root)
            a=deploy.compose(core,[],root/'native');self.assertNotIn('test',a['providers'])
            b=deploy.compose(core,[provider],root/'full');self.assertIn('test',b['providers']);self.assertEqual((root/'full/engine.wasm').read_bytes(),b'bytes')
            with self.assertRaisesRegex(ValueError,'must not exist'):deploy.compose(core,[],root/'native')
    def test_corrupt_unqualified_incompatible_and_incomplete_assets(self):
        for fault in ['hash','identity','version','inventory','collision','symlink']:
            with self.subTest(fault=fault),tempfile.TemporaryDirectory() as temp:
                root=Path(temp).resolve();core,provider,manifest=self.fixture(root)
                if fault=='hash':(provider/'runtime/engine.wasm').write_bytes(b'other')
                if fault=='identity':manifest['provides'][0]['implementationIdentity']='forged'
                if fault=='version':manifest['compatibleCore']='2.0.0'
                if fault=='inventory':manifest['assets']=[]
                if fault=='collision':
                    inventory=json.loads((core/'license-map.json').read_text());inventory['engine.wasm']=['Apache-2.0'];(core/'license-map.json').write_text(json.dumps(inventory));(core/'engine.wasm').write_bytes(b'core')
                if fault=='symlink':(provider/'runtime/engine.wasm').unlink();(provider/'runtime/engine.wasm').symlink_to(core/'package.json')
                (provider/'provider-manifest.json').write_text(json.dumps(manifest))
                with self.assertRaises(ValueError):deploy.compose(core,[provider],root/'output')
                self.assertFalse((root/'output').exists())

if __name__=='__main__':unittest.main()
