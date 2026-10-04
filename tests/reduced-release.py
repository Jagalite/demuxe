#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Synthetic reduced publication guards; never publishes or starts a browser."""
import copy
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import reduced_release as v
spec=importlib.util.spec_from_file_location('reduced_publisher',v.ROOT/'scripts/publish-reduced-release.py');pub=importlib.util.module_from_spec(spec);spec.loader.exec_module(pub)
TAG='reduced-v0.3.0-beta.6-rc.1';COMMIT='a'*40

def data(value):return value if isinstance(value,bytes) else json.dumps(value).encode()
def sha(value):return hashlib.sha256(data(value)).hexdigest()
def tar(path,files):
    with tarfile.open(path,'w:gz') as out:
        for name,value in files.items():
            blob=data(value);member=tarfile.TarInfo(name);member.size=len(blob);out.addfile(member,io.BytesIO(blob))

class ReducedTests(unittest.TestCase):
    def setUp(self):
        self.tag=TAG;self.version=getattr(self,'version','0.3.0-beta.6')
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup);self.d=Path(self.temp.name)
        self.source_files={f'demuxe/native/input{i}':b'native' for i in range(263)}
        self.source_files.update({'demuxe/scripts/reduced_release.py':(v.ROOT/'scripts/reduced_release.py').read_bytes(),'demuxe/scripts/publish-reduced-release.py':(v.ROOT/'scripts/publish-reduced-release.py').read_bytes(),'demuxe/tests/player-component.mjs':''.join(f"await check('case{i}',fn);\n" for i in range(60)).encode()})
        self.build={'inputs':{f'native/input{i}':sha(b'native') for i in range(263)},'artifacts':{'web/engine-hybrid/player.wasm':{'sha256':sha(b'wasm'),'bytes':4}},'sdkSources':{'lib.c':sha(b'sdk')},'configurations':{'config.json':sha(b'config')},'sharedTools':{}}
        self.source_files.update({'toolchain/emscripten/lib.c':b'sdk','build-materials/config.json':b'config','build-materials/build/beta-build.json':self.build})
        self.source_files['demuxe/docs/release-candidates/'+self.version+'.md']=b'Reduced qualification; historical uncertainty unresolved.'
        self.project={'name':'demuxe','version':self.version,'description':'Fixture','repository':'fixture','bugs':'fixture','homepage':'fixture','keywords':[],'exports':{}}
        self.source_files['demuxe/package.json']=self.project
        self.source_files['demuxe/bin/demuxe.mjs']=b'// fixture CLI'
        self.tagged={n[7:]:sha(b) for n,b in self.source_files.items() if n.startswith('demuxe/')}
        import license_policy
        self.package=v.package_metadata(self.project,license_policy.Policy(v.ROOT).config['packageLicenses'])
        self.runtime_files={'bin/demuxe.mjs':b'// fixture CLI','package.json':self.package,'engine-build.json':self.build,'web/engine-hybrid/player.wasm':b'wasm'}
        self.runtime_files.update({name:("// SPDX-License-Identifier: Apache-2.0\nexport * from './web/generated/"+('player/index.js' if name.startswith('player.') else 'index.js')+"';\n").encode() for name in ('index.js','index.d.ts','player.js','player.d.ts')})
        self.record={'schema':1,'status':'reduced-stable-tested' if getattr(self,'stable',False) else 'reduced-developer-beta-tested','fullReleaseQualified':False,'sourceTag':self.tag,'sourceCommit':COMMIT,'deferredSuites':sorted(v.DEFERRED),'acceptedFindings':[{'id':'chrome-worker-teardown-historical','status':'accepted-unresolved','authorization':'User accepted last attempt then documented release','limitation':'Historical outcome remains unknown'}],'gateOriginalDirectory':'/gate','evidenceFiles':[]}
        self.gate={'sourceCommit':COMMIT,'completed':True,'passed':True,'fullReleaseQualified':False,'runtimeUnchanged':True,'archiveUnchanged':True,'sourceUnchanged':True,'cwd':'/checkout','rows':[]}
        if getattr(self,'stable',False):self.record.update(releaseEligible=True,acceptedGateFailures=[])
        self.add_asset('gateController','reduced-controller.py',b'# source-bound controller')
        self.add_asset('releaseNotes','reduced-notes.md',b'Reduced qualification; historical uncertainty unresolved.')
        self.repack()
        self.binding={'archiveSHA256':self.record['runtime']['sha256'],'runtimeFiles':self.actual_runtime,'harnessSourceFixtures':{'/checkout/'+n[7:]:sha(b) for n,b in self.source_files.items() if n.startswith(('demuxe/scripts/','demuxe/tests/','demuxe/src/','demuxe/web/generated/'))}}
        self.binding['harnessSourceFixtures']['/gate/run.py']=self.record['gateController']['sha256']
        for label,count in v.ROWS.items():
            log='PASS '+label[9:]+' fixture: 32 timeline clicks match hover targets; real playback reaches the displayed target\n' if label.startswith('timeline-') else '# tests 11\n# pass 11\n# fail 0\n' if label=='copy-assets' else 'PASS\n'
            logname='reduced-'+label+'.log';self.add_evidence('/gate/'+label+'.log',logname,log.encode())
            row={'label':label,'expectedCount':count,'exitCode':0,'passed':True,'logSHA256':sha(log.encode()),'reports':[]}
            if not label.startswith('timeline-') and label!='copy-assets':
                report={'family':label.split('-',1)[1],'passed':True,'checks':[{'name':f'case{i}','passed':True} for i in range(count)]}
                if label.startswith('keyboard-'):
                    report['expectedCases']=36;report['checks']=[{'kind':kind,'key':key,'passed':True} for kind in ('playing','paused') for key in ['ArrowLeft','ArrowRight','j','l','Home','End',*'0123456789']]+[{'kind':kind,'key':'ArrowRight','passed':True} for kind in ('drag','volume','timeline','menu')]
                elif label.startswith('consumer-'):
                    report['archiveSHA256']=self.record['runtime']['sha256'];names=['static core-only import has no UI or engine side effects','bundled core-only import has no UI or engine side effects']+[f'{b} application at {p}' for b in ('static','bundled') for p in ('/assets/demuxe/','/deep/runtime-v2/')]+['missing assets have structured errors','runtime policy separates private qualification from pthread isolation'];report['checks']=[{'name':name,'passed':True,'attempts':[]} for name in names]
                elif label=='local-three':report={'passed':True,'completedCases':9,'browsers':[{'family':b,'passed':True,'checks':[{'mode':m,'passed':True} for m in ('native','hybrid','software')]} for b in ('chrome','firefox','webkit')]}
                elif label.startswith('audio-tail-'):report={'cases':[{'name':'audio-tail','passed':True}]}
                original='/results/'+label+'/result.json';name='reduced-'+label+'.json';self.add_evidence(original,name,report);row['reports']=[{'path':original,'sha256':sha(report)}]
            self.gate['rows'].append(row)
        self.save()
    def add_asset(self,key,name,value):
        (self.d/name).write_bytes(data(value));self.record[key]={'file':name,'sha256':sha(value)}
    def add_evidence(self,original,name,value):
        (self.d/name).write_bytes(data(value));self.record['evidenceFiles'].append({'originalPath':original,'file':name,'sha256':sha(value)})
    def repack(self):
        source_manifest={'sourceTag':self.tag,'sourceCommit':COMMIT,'files':{n:sha(b) for n,b in self.source_files.items()}}
        source=self.d/'demuxe-source.tar.gz';tar(source,{**self.source_files,'source-manifest.json':source_manifest});self.record['source']={'file':source.name,'sha256':v.digest(source)}
        manifest={'status':'beta-candidate-not-production-qualified','qualification':{'production':False},'version':self.version,'sourceTag':self.tag,'sourceCommit':COMMIT,'dirtySource':False,'sourceArchive':{'filename':source.name,'sha256':v.digest(source),'bytes':source.stat().st_size},'files':{n:{'sha256':sha(b),'bytes':len(data(b))} for n,b in self.runtime_files.items()}}
        files={'package/'+n:b for n,b in self.runtime_files.items()};files['package/release-manifest.json']=manifest;runtime=self.d/'demuxe.tgz';tar(runtime,files);self.record['runtime']={'file':runtime.name,'sha256':v.digest(runtime)};self.actual_runtime={n[8:]:sha(b) for n,b in files.items()}
    def save(self):
        with tarfile.open(self.d/'demuxe.tgz') as t:outputs={m.name:{'sha256':hashlib.file_digest(t.extractfile(m),'sha256').hexdigest(),'bytes':m.size} for m in t if m.isfile()}
        self.add_asset('installedManifest','reduced-installed.json',{'qualificationManifestKind':'immutable-installed-beta-archive','sourceCommit':COMMIT,'archiveSHA256':self.record['runtime']['sha256'],'outputs':outputs})
        self.add_asset('nativeCorrespondence','reduced-native.json',{'candidate':COMMIT,'recordSHA256':sha(self.build),'recordedNativeInputsUnchanged':True})
        self.add_asset('gate','reduced-gate.json',self.gate);self.add_asset('bindings','reduced-bindings.json',self.binding);(self.d/'reduced-qualification.json').write_text(json.dumps(self.record))
    def validate(self):
        # Package licensing has its own maintained tests; synthetic byte fixtures
        # exercise all new provenance/evidence guards before that existing check.
        import license_policy
        with patch.object(v,'tracked_source',return_value=self.tagged),patch.object(license_policy.Policy,'check_package'),patch.object(license_policy,'LEGAL',[]):
            return v.validate(self.d,self.tag,COMMIT,stable=getattr(self,'stable',False))
    def test_valid_reduced_receipt(self):self.assertEqual(self.validate()[1],'0.3.0-beta.6')
    def test_canonical_rc_receipt(self):
        self.version='1.0.0-rc.1'
        with patch.dict(globals(),TAG='reduced-v1.0.0-rc.1'):self.setUp()
        self.assertEqual(self.validate()[1],self.version)
    def test_mismatched_rc_tag_and_stable_version(self):
        for version,tag,message in [('1.0.0-rc.1','reduced-v1.0.0-rc.2','source/tag/version'),('1.0.0-rc.1','reduced-v1.0.0-rc.1-rc.1','source/tag/version'),('1.0.0','reduced-v1.0.0-rc.1','Wrong/private/stable')]:
            self.version=version
            with patch.dict(globals(),TAG=tag):self.setUp()
            with self.assertRaisesRegex(ValueError,message):self.validate()
    def stable_fixture(self,tag='reduced-v1.0.0'):
        self.version='1.0.0';self.stable=True
        with patch.dict(globals(),TAG=tag):self.setUp()
    def test_stable_requires_explicit_policy(self):
        self.stable_fixture();self.assertEqual(self.validate()[1],'1.0.0')
        self.stable=False
        with self.assertRaisesRegex(ValueError,'tag policy'):self.validate()
    def test_stable_rejects_prerelease_and_mismatch(self):
        self.stable=True
        with self.assertRaisesRegex(ValueError,'tag policy'):self.validate()
        self.stable_fixture('reduced-v1.0.1')
        with self.assertRaisesRegex(ValueError,'source/tag/version'):self.validate()
    def test_stable_status_and_full_claim_fail_closed(self):
        self.stable_fixture();self.record['status']='reduced-developer-beta-tested';self.save()
        with self.assertRaisesRegex(ValueError,'status'):self.validate()
        self.record['status']='reduced-stable-tested';self.record['fullReleaseQualified']=True;self.save()
        with self.assertRaisesRegex(ValueError,'status'):self.validate()
    def test_stable_cannot_claim_production_qualification(self):
        self.stable_fixture();path=self.d/'demuxe.tgz'
        with tarfile.open(path) as t:files={m.name:t.extractfile(m).read() for m in t if m.isfile()}
        manifest=json.loads(files['package/release-manifest.json']);manifest['qualification']['production']=True
        files['package/release-manifest.json']=manifest;tar(path,files);self.record['runtime']['sha256']=v.digest(path);self.save()
        with self.assertRaisesRegex(ValueError,'truthful limited qualification'):self.validate()
    def test_existing_published_prerelease_not_promoted(self):
        self.stable_fixture();calls=[]
        def gh(*args):
            calls.append(args)
            if args[:1]==('api',) and 'git/ref/tags' in args[1]:return json.dumps({'object':{'type':'commit','sha':COMMIT}})
            if args[:1]==('api',):return json.dumps([[{'tag_name':self.tag}]])
            if args[:2]==('release','view'):return json.dumps({'isDraft':False,'isPrerelease':True,'assets':[]})
            raise AssertionError('Unexpected mutation')
        with patch.object(pub,'validate'),patch.object(pub,'gh',side_effect=gh):
            with self.assertRaisesRegex(ValueError,'different stable/prerelease policy'):pub.publish(self.d,self.tag,COMMIT,'o/r',stable=True)
        self.assertFalse(any(c[:2] in [('release','edit'),('release','create'),('release','upload')] for c in calls))
    def test_stable_integrity_still_required(self):
        self.stable_fixture();(self.d/self.record['evidenceFiles'][0]['file']).write_text('tampered')
        with self.assertRaisesRegex(ValueError,'hash mismatch'):self.validate()
    def test_stable_github_semantics_explicit(self):
        self.stable_fixture();calls=[]
        def gh(*args):
            calls.append(args)
            if args[:1]==('api',) and 'git/ref/tags' in args[1]:return json.dumps({'object':{'type':'commit','sha':COMMIT}})
            if args[:1]==('api',):return '[[]]'
            if args[:2]==('release','view'):return json.dumps({'isDraft':True,'assets':[]})
            return ''
        # Full validation is tested above; isolate GitHub API state transitions here.
        with patch.object(pub,'validate') as validate,patch.object(pub,'gh',side_effect=gh):
            pub.publish(self.d,self.tag,COMMIT,'o/r',stable=True)
            validate.assert_called_once_with(self.d,self.tag,COMMIT,stable=True)
        create=next(c for c in calls if c[:2]==('release','create'));edit=next(c for c in calls if c[:2]==('release','edit'))
        self.assertIn('--prerelease=false',create);self.assertIn('--prerelease=false',edit);self.assertIn('--latest=true',edit)
    def test_stable_rejected_before_remote_access_without_opt_in(self):
        self.stable_fixture()
        with patch.object(pub,'gh') as gh:
            with self.assertRaisesRegex(ValueError,'tag policy'):pub.publish(self.d,self.tag,COMMIT,'o/r')
            gh.assert_not_called()
    def cleanup_fixture(self):
        self.stable_fixture();row=next(r for r in self.gate['rows'] if r['label']=='consumer-chrome')
        entry=next(e for e in self.record['evidenceFiles'] if e['originalPath']==row['reports'][0]['path']);report=json.loads((self.d/entry['file']).read_text())
        url='http://127.0.0.1:12345/deep/runtime-v2/web/software-full-engine-worker.js'
        events=[{'kind':'created','id':i,'url':url if i==52 else 'worker'+str(i)} for i in range(1,61)]+[{'kind':'closed','id':i,'url':'worker'+str(i)} for i in range(1,61) if i!=52]
        attempt={'error':'AssertionError [ERR_ASSERTION]: Workers still alive after destroy: '+url+'\n\n1 !== 0\n\n    at file:///checkout/tests/public-api-consumer.mjs:46:8','failedRequests':[],'pageErrors':[],'workers':[url],'cleanup':{'workersAtObservation':1,'unprobed':0,'dropped':0,'events':events,'owners':{'status':'fulfilled','value':{'connectedIframes':0,'owners':[{'label':'viewer','phase':'closed','iframeConnected':False,'contextState':'closed'},{'label':'custom'}]}},'targets':{'status':'fulfilled','value':{'targetInfos':[{'type':'worker','url':url,'attached':True}]}},'workers':[{'id':52,'url':url,'classification':'target-still-reported','probe':{'status':'timeout'}}]}}
        report['checks'][5].update(passed=False,attempts=[attempt]);report['passed']=False;row.update(passed=False,exitCode=1,failure='Child exited unsuccessfully');self.gate['passed']=False
        return row,entry,report,attempt
    def save_cleanup(self,row,entry,report,derive=True):
        (self.d/entry['file']).write_bytes(data(report));entry['sha256']=sha(report);row['reports'][0]['sha256']=sha(report)
        if derive:self.record.update(v.derive_stable_eligibility(self.gate,{sha(report):report},COMMIT,self.record['runtime']['sha256']))
        self.save()
    def test_stable_known_cleanup_keeps_raw_failure(self):
        row,entry,report,attempt=self.cleanup_fixture();self.save_cleanup(row,entry,report)
        self.assertEqual(self.validate()[1],'1.0.0');self.assertFalse(self.gate['passed']);self.assertFalse(row['passed']);self.assertFalse(report['passed']);self.assertEqual(len(self.record['acceptedGateFailures']),1)
    def test_cleanup_other_failure_signatures_rejected(self):
        mutations=[lambda r,a:r['checks'][4].update(passed=False),lambda r,a:a['cleanup']['workers'][0].update(url='http://127.0.0.1:12345/deep/runtime-v2/web/io-worker.js'),lambda r,a:r['checks'][5]['attempts'].append(copy.deepcopy(a)),lambda r,a:a['cleanup'].pop('owners'),lambda r,a:a['pageErrors'].append('unexpected'),lambda r,a:a['failedRequests'].append('unexpected'),lambda r,a:a['cleanup']['workers'][0].update(probe={'status':'fulfilled'}),lambda r,a:r.update(family='firefox'),lambda r,a:r.update(archiveSHA256='0'*64)]
        for mutate in mutations:
            with self.subTest(mutate=mutate):
                row,entry,report,attempt=self.cleanup_fixture();mutate(report,attempt)
                with self.assertRaises(ValueError):self.save_cleanup(row,entry,report)
    def test_cleanup_gate_guards_rejected(self):
        for mutation in ['other-row','source','preservation','firefox']:
            with self.subTest(mutation=mutation):
                row,entry,report,attempt=self.cleanup_fixture()
                if mutation=='other-row':self.gate['rows'][0].update(passed=False,exitCode=1)
                elif mutation=='source':self.gate['sourceCommit']='b'*40
                elif mutation=='preservation':self.gate['sourceUnchanged']=False
                else:row['label']='consumer-firefox'
                with self.assertRaises(ValueError):self.save_cleanup(row,entry,report)
    def test_cleanup_receipt_descriptor_cannot_be_forged(self):
        row,entry,report,attempt=self.cleanup_fixture();self.save_cleanup(row,entry,report);self.record['acceptedGateFailures'][0]['reportSHA256']='0'*64;self.save()
        with self.assertRaisesRegex(ValueError,'eligibility receipt'):self.validate()
    def test_prerelease_cannot_use_cleanup_exception(self):
        row,entry,report,attempt=self.cleanup_fixture();self.save_cleanup(row,entry,report)
        with self.assertRaisesRegex(ValueError,'Incomplete reduced gate'):v.validate_evidence(self.d,self.record,self.record['runtime']['sha256'],{},self.actual_runtime,[f'case{i}' for i in range(60)])
    def test_missing_or_duplicate_rows(self):
        for rows in [self.gate['rows'][:-1],self.gate['rows'][:-1]+[self.gate['rows'][0]]]:
            self.gate['rows']=rows;self.save()
            with self.assertRaisesRegex(ValueError,'gate rows'):self.validate()
    def test_failed_preservation(self):
        self.gate['sourceUnchanged']=False;self.save()
        with self.assertRaisesRegex(ValueError,'preservation'):self.validate()
    def test_evidence_tamper(self):
        (self.d/self.record['evidenceFiles'][0]['file']).write_text('changed')
        with self.assertRaisesRegex(ValueError,'hash mismatch'):self.validate()
    def test_archive_tamper(self):
        with (self.d/'demuxe.tgz').open('ab') as f:f.write(b'changed')
        with self.assertRaisesRegex(ValueError,'hash mismatch'):self.validate()
    def test_full_claim_forbidden(self):
        self.record['fullReleaseQualified']=True;self.save()
        with self.assertRaisesRegex(ValueError,'qualification status'):self.validate()
    def test_scope_and_acceptance_required(self):
        self.record['acceptedFindings']=[];self.save()
        with self.assertRaisesRegex(ValueError,'historical uncertainty'):self.validate()
    def test_source_tampered_but_self_consistently_rehashed(self):
        self.source_files['demuxe/tests/player-component.mjs']+=b'// altered';self.repack();self.save()
        with self.assertRaisesRegex(ValueError,'tagged tree'):self.validate()
    def test_missing_tagged_source(self):
        del self.source_files['demuxe/native/input1'];self.repack();self.save()
        with self.assertRaisesRegex(ValueError,'tagged tree'):self.validate()
    def test_native_input_record_mismatch(self):
        self.build['inputs']['native/input1']='0'*64;self.repack();self.save()
        with self.assertRaisesRegex(ValueError,'Native input mismatch'):self.validate()
    def test_native_artifact_tamper(self):
        self.runtime_files['web/engine-hybrid/player.wasm']=b'bad!';self.repack();self.save()
        with self.assertRaisesRegex(ValueError,'Native artifact'):self.validate()
    def test_runtime_binding_mismatch(self):
        self.binding['runtimeFiles']['package.json']='0'*64;self.save()
        with self.assertRaisesRegex(ValueError,'runtime inventory'):self.validate()
    def test_wrong_component_case_same_count(self):
        entry=next(x for x in self.record['evidenceFiles'] if x['file']=='reduced-component-chrome.json');r=json.loads((self.d/entry['file']).read_text());r['checks'][0]['name']='substitute';(self.d/entry['file']).write_bytes(data(r));entry['sha256']=sha(r);self.gate['rows'][0]['reports'][0]['sha256']=sha(r);self.save()
        with self.assertRaisesRegex(ValueError,'component case set'):self.validate()
    def test_unknown_asset_prefix(self):
        self.record['gate']['file']='outside.json';self.save();self.record['gate']['file']='outside.json';(self.d/'reduced-qualification.json').write_text(json.dumps(self.record))
        with self.assertRaisesRegex(ValueError,'reduced- prefix'):self.validate()
    def test_full_receipt_not_accepted(self):
        (self.d/'verification.json').write_text('{}')
        with self.assertRaisesRegex(ValueError,'mix reduced'):self.validate()
    def test_runtime_generated_source_mismatch(self):
        self.source_files['demuxe/web/generated/index.js']=b'export const x=1;';self.tagged['web/generated/index.js']=sha(b'export const x=1;')
        self.runtime_files['web/generated/index.js']=b'export const x=2;';self.repack();self.save()
        with self.assertRaisesRegex(ValueError,'Runtime web bytes'):self.validate()
    def test_unsafe_and_duplicate_archive_members(self):
        for name in ['../escape','package/package.json']:
            with self.subTest(name=name):
                self.repack()
                path=self.d/'demuxe.tgz'
                with tarfile.open(path) as t:files={m.name:t.extractfile(m).read() for m in t if m.isfile()}
                with tarfile.open(path,'w:gz') as t:
                    for key,value in [*files.items(),(name,b'bad')]:
                        m=tarfile.TarInfo(key);m.size=len(value);t.addfile(m,io.BytesIO(value))
                self.record['runtime']['sha256']=v.digest(path);self.save()
                with self.assertRaisesRegex(ValueError,'Unsafe archive|Duplicate archive'):self.validate()
    def test_npm_lifecycle_script_rejected(self):
        self.package['scripts']={'postinstall':'bad'};self.repack();self.save()
        with self.assertRaisesRegex(ValueError,'package metadata'):self.validate()
    def test_cli_self_hashed_tamper(self):
        self.runtime_files['bin/demuxe.mjs']=b'changed';self.repack();self.save()
        with self.assertRaisesRegex(ValueError,'Published CLI'):self.validate()
    def test_optional_companion_hash_required(self):
        self.runtime_files['web/engine-adaptation/manifest.json']={'sourceBuildVerification':{'verified':True},'sourceCompanion':{'filename':'optional-source.tar.gz','sha256':'0'*64}}
        (self.d/'optional-source.tar.gz').write_bytes(b'wrong');self.repack();self.save()
        with self.assertRaisesRegex(ValueError,'Optional companion mismatch'):self.validate()
    def test_workflow_keeps_full_and_reduced_routes_separate(self):
        text=(v.ROOT/'.github/workflows/pages.yml').read_text()
        self.assertIn("tags: ['**', '!modular-*', '!reduced-*']",text)
        self.assertIn('if [[ "$RELEASE_TAG" == reduced-* ]]; then',text)
        self.assertIn('python3 scripts/publish-reduced-release.py --assets build/npm-release',text)
        self.assertIn('python3 scripts/publish-npm-release.py --assets build/npm-release',text)
        self.assertIn('test "${{ github.event.release.prerelease }}" = false',text)
        self.assertIn('test "${{ github.event_name }}" = release',text)
        self.assertIn('stable_args=(--stable)',text)
    def test_wrong_remote_tag_has_no_mutation(self):
        with patch.object(pub,'validate'),patch.object(pub,'gh',return_value=json.dumps({'object':{'type':'commit','sha':'b'*40}})) as gh:
            with self.assertRaisesRegex(ValueError,'Remote release tag'):pub.publish(self.d,TAG,COMMIT,'o/r')
            self.assertEqual(len(gh.call_args_list),1);self.assertEqual(gh.call_args.args[0],'api')

if __name__=='__main__':unittest.main()
