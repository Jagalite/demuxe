#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Installed package deployment boundary regressions, independent of engines."""
import importlib.util,json,sys,tempfile,unittest,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'scripts'))
spec=importlib.util.spec_from_file_location('deployment',ROOT/'scripts/deploy-providers.py');deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)

class DeploymentTests(unittest.TestCase):
    def fixture(self,root):
        core=root/'core';core.mkdir();(core/'package.json').write_text(json.dumps({'name':'demuxe','version':'1.0.0'}));(core/'license-map.json').write_text(json.dumps({'package.json':['Apache-2.0'],'license-map.json':['Apache-2.0']}))
        provider=root/'provider';(provider/'runtime').mkdir(parents=True);(provider/'runtime/engine.wasm').write_bytes(b'bytes');(provider/'license-map.json').write_text('{}')
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
    def test_shared_identical_provider_assets_are_deduplicated(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve();core,provider,manifest=self.fixture(root)
            second=root/'second';shutil.copytree(provider,second)
            metadata=json.loads((second/'package.json').read_text());metadata['name']='@demuxe/second'
            (second/'package.json').write_text(json.dumps(metadata));manifest['package']=metadata['name'];manifest['provides'][0]['id']='second'
            (second/'provider-manifest.json').write_text(json.dumps(manifest))
            deploy.compose(core,[provider,second],root/'both')
            catalog=json.loads((root/'both/demuxe-providers.json').read_text());self.assertEqual(len(catalog['assets']),1)
            self.assertEqual({f['id'] for f in catalog['providers']} & {'test','second'},{'test','second'})
            # Identical core bytes are still not provider-owned shared assets.
            inventory=json.loads((core/'license-map.json').read_text());inventory['engine.wasm']=['Apache-2.0']
            (core/'license-map.json').write_text(json.dumps(inventory));(core/'engine.wasm').write_bytes(b'bytes')
            with self.assertRaisesRegex(ValueError,'collision'):deploy.compose(core,[provider],root/'rejected')

    def test_shared_core_apache_license_boundary_for_each_provider(self):
        with tempfile.TemporaryDirectory()as temp:
            root=Path(temp).resolve();core,provider,_=self.fixture(root);data=b'export const answer=42;';target='web/dependency.js';(core/'web').mkdir();(core/target).write_bytes(data);inventory=json.loads((core/'license-map.json').read_text());inventory[target]=['Apache-2.0'];(core/'license-map.json').write_text(json.dumps(inventory))
            def package(name,license):
                p=root/name;(p/'runtime/web').mkdir(parents=True);(p/('runtime/'+target)).write_bytes(data);artifacts={'runtime/'+target:deploy.sha(data)};identity='sha256:'+deploy.sha(deploy.encoded(artifacts));(p/'package.json').write_text(json.dumps({'name':'@demuxe/'+name,'version':'1.0.0','peerDependencies':{'demuxe':'1.0.0'}}));(p/'license-map.json').write_text(json.dumps({'runtime/'+target:[license]}));(p/'provider-manifest.json').write_text(json.dumps({'providerContractVersion':1,'package':'@demuxe/'+name,'version':'1.0.0','compatibleCore':'1.0.0','artifacts':artifacts,'assets':[{'id':'shared','path':target,'bytes':len(data),'sha256':deploy.sha(data),'dependencies':[]}],'provides':[{'id':name,'implementationIdentity':identity,'assetIds':['shared']}]}));return p
            a=package('a','Apache-2.0');b=package('b','LGPL-2.1-or-later');c=package('c','Apache-2.0')
            with self.assertRaisesRegex(ValueError,'collision'):deploy.compose(core,[a,b],root/'bad')
            result=deploy.compose(core,[a,c],root/'good');self.assertIn('a',result['providers']);self.assertIn('c',result['providers']);self.assertEqual((root/'good'/target).read_bytes(),data)

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
