#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Installed package deployment boundary regressions, independent of engines."""
import importlib.util,io,json,sys,tarfile,tempfile,unittest,shutil
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
    def test_content_addressed_presenter_is_opt_in_and_tracks_core_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve();core,provider,_=self.fixture(root)
            deploy.compose(core,[provider],root/'legacy')
            deploy.compose(core,[provider],root/'first',content_addressed_presenter=True)
            deploy.compose(core,[provider],root/'repeat',content_addressed_presenter=True)
            def identities(name):
                manifest=json.loads((root/name/'demuxe-providers.json').read_text())
                return {row['id']:row['implementationIdentity'] for row in manifest['providers']}
            legacy,first,repeat=identities('legacy'),identities('first'),identities('repeat')
            self.assertEqual(legacy['browser-prepared'],'demuxe-browser-v1')
            self.assertRegex(first['browser-prepared'],r'^sha256:[0-9a-f]{64}$')
            self.assertEqual(first,repeat)
            self.assertEqual(first['browser-original'],legacy['browser-original'])
            metadata=json.loads((core/'package.json').read_text());metadata['description']='changed core';(core/'package.json').write_text(json.dumps(metadata))
            deploy.compose(core,[provider],root/'changed',content_addressed_presenter=True)
            changed=identities('changed');self.assertNotEqual(first['browser-prepared'],changed['browser-prepared'])
            self.assertEqual(first['test'],changed['test'])

    def test_format_delivery_is_explicit_and_individual(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp).resolve();core,provider,provider_manifest=self.fixture(root);formats=root/'formats';formats.mkdir();entries=[]
            source_root=root/'format-source';(source_root/'source').mkdir(parents=True);source_files={'demuxe-adapter/build-delivery.mjs':b'builder','demuxe-adapter/adapter.js':b'adapter','upstream/mediabunny/dist/module.js':b'upstream'}
            facts=[{'path':name,'bytes':len(data),'sha256':deploy.sha(data)} for name,data in source_files.items()];runtime_name='runtime/web/providers/mediabunny/mp4.js';(source_root/'runtime/web/providers/mediabunny').mkdir(parents=True);(source_root/runtime_name).write_bytes(b'worker');artifacts={runtime_name:deploy.sha(b'worker')};identity='sha256:'+deploy.sha(deploy.encoded(artifacts));provider_manifest={'package':'@demuxe/provider-mediabunny','providerContractVersion':1,'artifacts':artifacts,'provides':[{'implementationIdentity':identity}]};manifest={'runtimeIdentity':identity,'upstream':'mediabunny@1.63.0','files':facts}
            archive=source_root/'source/archive.tar.gz'
            with tarfile.open(archive,'w:gz') as tar:
                for name,data in [*source_files.items(),('source-manifest.json',json.dumps(manifest).encode())]:
                    member=tarfile.TarInfo(name);member.size=len(data);tar.addfile(member,io.BytesIO(data))
            raw=archive.read_bytes();(source_root/'source-companion.json').write_text(json.dumps({'path':'source/archive.tar.gz','bytes':len(raw),'sha256':deploy.sha(raw),'runtimeIdentity':identity}));(source_root/'provider-manifest.json').write_text(json.dumps(provider_manifest))
            for name in ['inspect-mp4','inspect-webm','preview-mp4','preview-webm']:
                data=('export const name='+repr(name)).encode();(formats/(name+'.js')).write_bytes(data);entries.append({'name':name,'bytes':len(data),'sha256':deploy.sha(data),'compiledInputs':facts[1:]})
            (formats/'format-delivery.json').write_text(json.dumps({'status':'format-delivery-build-checked-not-browser-qualification','builderSHA256':deploy.sha(b'builder'),'entries':entries}))
            (formats/'Apache-2.0.txt').write_bytes((ROOT/'LICENSES/Apache-2.0.txt').read_bytes());(formats/'MPL-2.0.txt').write_bytes((ROOT/'packages/provider-mediabunny/source-build/mediabunny/LICENSE').read_bytes())
            (formats/'NOTICE.txt').write_text('Demuxe adapter code: Apache-2.0. MediaBunny1.63.0: Copyright(c)2026-present Vanilagy and contributors; MPL-2.0. Original source notices remain in the bundles. Corresponding preferred source is provided separately by build.mjs; verify exact correspondence with test/rebuild-source.mjs and DEMUXE_FORMAT_DELIVERY. These artifacts remain candidates, not release qualification.\n')
            deploy.compose(core,[provider],root/'default')
            self.assertFalse((root/'default/demuxe-mediabunny-format-assets.json').exists())
            deploy.compose(core,[provider],root/'selected',format_delivery=formats,format_source=source_root,format_entries=['inspect-mp4','preview-webm'])
            result=json.loads((root/'selected/demuxe-mediabunny-format-assets.json').read_text())
            self.assertEqual([row['name'] for row in result['entries']],['inspect-mp4','preview-webm']);self.assertEqual(len(result['notices']),3)
            self.assertEqual((root/'selected/web/providers/mediabunny/formats/MPL-2.0.txt').read_bytes(),(formats/'MPL-2.0.txt').read_bytes())
            for name in ['inspect-mp4','preview-webm']:
                self.assertEqual((root/'selected/web/providers/mediabunny/formats'/(name+'.js')).read_bytes(),(formats/(name+'.js')).read_bytes())
            self.assertFalse((root/'selected/web/providers/mediabunny/formats/inspect-webm.js').exists())
            bad_worker=root/'bad-source-worker';shutil.copytree(source_root,bad_worker);(bad_worker/runtime_name).write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError,'provider artifact'):deploy.compose(core,[],root/'bad-worker',format_delivery=formats,format_source=bad_worker,format_entries=['preview-webm'])
            self.assertFalse((root/'bad-worker').exists())
            # Even a rehashed, internally consistent source companion cannot
            # replace inputs named by the selected format build report.
            forged=root/'forged-source';shutil.copytree(source_root,forged);changed=dict(source_files);changed['demuxe-adapter/adapter.js']=b'changed adapter'
            altered_facts=[{'path':name,'bytes':len(data),'sha256':deploy.sha(data)} for name,data in changed.items()];altered_manifest={**manifest,'files':altered_facts};forged_archive=forged/'source/archive.tar.gz'
            with tarfile.open(forged_archive,'w:gz') as tar:
                for name,data in [*changed.items(),('source-manifest.json',json.dumps(altered_manifest).encode())]:
                    member=tarfile.TarInfo(name);member.size=len(data);tar.addfile(member,io.BytesIO(data))
            raw=forged_archive.read_bytes();(forged/'source-companion.json').write_text(json.dumps({'path':'source/archive.tar.gz','bytes':len(raw),'sha256':deploy.sha(raw),'runtimeIdentity':identity}))
            with self.assertRaisesRegex(ValueError,'compiled input'):deploy.compose(core,[],root/'rehashed-source',format_delivery=formats,format_source=forged,format_entries=['preview-webm'])
            self.assertFalse((root/'rehashed-source').exists())
            catalog=json.loads((root/'selected/demuxe-providers.json').read_text());self.assertFalse(any('formats/' in item['path'] for item in catalog['assets']))
            (formats/'inspect-mp4.js').write_bytes(b'corrupted')
            deploy.compose(core,[],root/'unrelated-corrupt',format_delivery=formats,format_source=source_root,format_entries=['preview-webm'])
            self.assertTrue((root/'unrelated-corrupt/web/providers/mediabunny/formats/preview-webm.js').is_file())
            with self.assertRaisesRegex(ValueError,'integrity'):deploy.compose(core,[],root/'corrupt',format_delivery=formats,format_source=source_root,format_entries=['inspect-mp4'])
            self.assertFalse((root/'corrupt').exists())
            with self.assertRaisesRegex(ValueError,'duplicate'):deploy.compose(core,[],root/'duplicate',format_delivery=formats,format_source=source_root,format_entries=['preview-webm','preview-webm'])
            with self.assertRaisesRegex(ValueError,'together'):deploy.compose(core,[],root/'missing-source',format_delivery=formats,format_entries=['preview-webm'])
            self.assertFalse((root/'missing-source').exists())
            changed_report=json.loads((formats/'format-delivery.json').read_text());changed_report['builderSHA256']='0'*64;(formats/'format-delivery.json').write_text(json.dumps(changed_report))
            with self.assertRaisesRegex(ValueError,'builder'):deploy.compose(core,[],root/'bad-builder',format_delivery=formats,format_source=source_root,format_entries=['preview-webm'])
            self.assertFalse((root/'bad-builder').exists());changed_report['builderSHA256']=deploy.sha(b'builder');(formats/'format-delivery.json').write_text(json.dumps(changed_report))
            with self.assertRaisesRegex(ValueError,'together'):deploy.compose(core,[],root/'missing',format_delivery=formats,format_source=source_root)
            self.assertFalse((root/'duplicate').exists());self.assertFalse((root/'missing').exists())
            report=json.loads((formats/'format-delivery.json').read_text());report['entries'].append(report['entries'][0]);(formats/'format-delivery.json').write_text(json.dumps(report))
            with self.assertRaisesRegex(ValueError,'inventory'):deploy.compose(core,[],root/'ambiguous',format_delivery=formats,format_source=source_root,format_entries=['preview-webm'])
            self.assertFalse((root/'ambiguous').exists())
            report['entries'].pop();report['entries'][3]['compiledInputs'][0]['sha256']='0'*64;(formats/'format-delivery.json').write_text(json.dumps(report))
            with self.assertRaisesRegex(ValueError,'compiled input'):deploy.compose(core,[],root/'wrong-source',format_delivery=formats,format_source=source_root,format_entries=['preview-webm'])
            self.assertFalse((root/'wrong-source').exists());report['entries'][3]['compiledInputs'][0]['sha256']=facts[1]['sha256']

            (formats/'format-delivery.json').write_text(json.dumps(report));(formats/'MPL-2.0.txt').write_text('forged MPL')
            with self.assertRaisesRegex(ValueError,'notice'):deploy.compose(core,[],root/'forged-notice',format_delivery=formats,format_source=source_root,format_entries=['preview-webm'])
            self.assertFalse((root/'forged-notice').exists())

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
