# SPDX-License-Identifier: Apache-2.0
"""Register completed R274 five-pair output; no measurement execution here."""
import datetime, hashlib, importlib.util, json, pathlib, statistics, sys
ROOT=pathlib.Path.cwd()
key='R274.virtual-webm-cues'; home=pathlib.Path('research/items')/key
performance=pathlib.Path(sys.argv[1]); result=json.loads((performance/'result.json').read_text())
assert result['passed'] and result['predeclared']['pairs']==5
assert result['sourceControls']=={'staleSourceRejected':True,'actualPendingConstructionRetired':True}
rows=result['cases']; reference=next(r for r in rows if r['mode']=='reference')
assert len(rows)==11
for r in rows:
    assert r['activeMode']=='native' and r['playSeekEof'] and r['workerCount']==0
    assert r['images']==reference['images']
pairs=[]
for i in range(5):
    b=next(r for r in rows if r['mode']=='baseline' and r['pair']==i)
    c=next(r for r in rows if r['mode']=='candidate' and r['pair']==i)
    pairs.append({'pair':i,'baselinePlayerMs':b['playerMs'],'candidatePlayerMs':c['playerMs'],'baselineObservedMs':b['playerObservedMs'],'candidateObservedMs':c['playerObservedMs'],'baselineOracleObserverMs':b['oracleObserverMs'],'candidateOracleObserverMs':c['oracleObserverMs'],'ratio':c['playerMs']/b['playerMs'],'baselineServerWrittenMediaBytes':b['serverWrittenMediaBytes'],'candidateServerWrittenMediaBytes':c['serverWrittenMediaBytes'],'baselineServerNodeSetupCpuSeconds':b['serverNodeCpuSeconds'],'candidateServerNodeSetupCpuSeconds':c['serverNodeCpuSeconds'],'candidateBuilderCpuSeconds':c['serverBuilderCpuSeconds'],'candidateServerSetupMs':c['serverSetupMs']})
ratio=statistics.median(p['ratio'] for p in pairs);passed=ratio<=.9 and all(p['ratio']<1 for p in pairs)
assert result['benefitGate']['passed']==passed
assert abs(result['benefitGate']['medianRatio']-ratio)<1e-12
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ');folder=pathlib.Path('research/shared/runs')/(stamp+'-r274-whole-player-index')
folder.mkdir(parents=True,exist_ok=False)
qualification={'status':'measured_lab_benefit' if passed else 'benefit_gate_failed','from_tier':'Native','to_tier':'Native','tier_effect':'Native->Native','production_admission_changed':False,'production_integration':False,'new_media_execution':True,'run':str(folder/'run.json'),'performance_evidence':str(performance/'result.json'),'candidate_owners':'Unchanged public Native Player plus local sourceproxy rebuilding Cues from cue-less VP9 SimpleBlocks at first request','scope':'Single-track video-only VP9 finite3,652,612-byte source; <=32MiB bound; unlaced SimpleBlocks,1ms scale, existing SeekHead and reserved tail Void. Local sourceproxy-assisted Native playback, not remote browser-only construction or arbitrary WebM.','cost_boundary':'Player construction/ready/open/play/three fixed seeks/EOF/destroy wall time subtracts directly measured canvas/readback/hash oracle cost (reported separately), retains both rAF presentation waits, and includes actual on-demand sourceproxy child process, full source read/scan/hash/index write/output read. Baseline stat plus requested ranges only; fixture provenance validated outside timing. Common module import/browser process launch excluded. Media bytes are server-written counts, not exact wire/client receipt. Node setup and child construction CPU reported separately; aggregate Chrome CPU, physical memory and energy unmeasured.','correctness':'900 packet identities/PTS/DTS/durations/key flags exact,30 rebuilt cue positions match independently authored oracle; public Player Native play/seeks/EOF, full target picture hashes, stale source identity, retired pending construction and zero-worker cleanup pass.','benefit_gate':{'metric':'complete Player lifecycle wall time minus directly measured canvas/hash oracle cost; presentation waits included','pairs':5,'requiredMedianSaving':.10,'requiredEveryPairFaster':True,'medianRatio':ratio,'medianSavingPercent':100*(1-ratio),'everyPairFaster':all(p['ratio']<1 for p in pairs),'passed':passed},'pairs':pairs,'limitations':['Authored fixture and one shared Chrome/macOS host; warm OS caches, fresh browser owners.','Sourceproxy already has local source file; a remote/browser-only index builder must additionally charge full source transfer before scanning.','Only video is selected; no audio, subtitle, arbitrary codec/container or general streaming qualification.','Three full-image seek targets are checked; packet and independent index identity cover complete encoded source. No physical display completeness claim.','Paired estimates apply to this paced localHTTP source and exact lifecycle; do not generalize to all network conditions. Direct oracle duration is subtracted, but observer interference with buffering/cache cannot be mathematically removed.']}
(folder/'results.json').write_text(json.dumps(qualification,indent=2)+'\n')
reason=('Passed' if passed else 'Failed')+' the predeclared complete Player lifecycle benefit gate after correctness. Five alternating fresh-browser pairs, actual source-only index construction charged: median candidate/baseline ratio '+format(ratio,'.6f')+'; every pair faster='+str(all(p['ratio']<1 for p in pairs))+'. '+qualification['scope']+' '+qualification['cost_boundary']
next_action=('Consider bounded sourceproxy integration only where this exact preallocated index profile and complete cost apply; qualify selected A/V, actual source transport and maintained automatic admission separately.' if passed else 'Stop this complete lifecycle profile; reopen only with materially different source distribution, repeated-seek workload or cheaper proven constructor. Earlier prebuilt-index seek savings remain valid in their conditional scope.')
artifacts=[]
folders=[home/'evidence/20260920T132110Z-cold-index-preparation',home/'evidence/20260920T132844Z-cold-index-player-pilot',performance]
for directory in folders:
    for f in sorted(directory.rglob('*')):
        if f.is_file():artifacts.append({'path':str(f),'license':'Apache-2.0' if f.suffix in ['.py','.mjs'] else 'CC-BY-4.0','role':'executed original source snapshot or raw source construction, independent validation and whole-player observation'})
for name in ['rebuild-cues.py','validate-rebuilt-cues.py','whole-player-cues.mjs','whole-player-plan.md','register-whole-player.py']:
    f=home/'tests'/name;artifacts.append({'path':str(f),'license':'CC-BY-4.0' if name.endswith('.md') else 'Apache-2.0','role':'original scoped reproduction source/contract'})
for f in ['research/shared/tooling/virtual-cues-fixture.py','research/shared/tooling/large-cluster-fixture.py','research/shared/runs/20260919T221240Z-virtual-cues-sized/cueless.webm','research/shared/runs/20260919T221240Z-virtual-cues-sized/index.json']:
    artifacts.append({'path':f,'license':'Apache-2.0' if f.endswith('.py') else 'CC-BY-4.0','role':'retained helper or source/oracle identity; original Cues index is independent oracle only'})
artifacts.append({'path':str(folder/'results.json'),'license':'CC-BY-4.0','role':'analysis and declared scoped qualification'})
sp=importlib.util.spec_from_file_location('record','research/shared/tooling/record-research-stage.py');module=importlib.util.module_from_spec(sp);sp.loader.exec_module(module)
module.record({'folder':str(folder),'stage':'decision','status':'passed','commands':['Host builder and independent validator: exact commands retained in host preparation commands.log.','Public Player correctness pilot: exact command retained in pilot commands.log.','node research/items/R274.virtual-webm-cues/tests/whole-player-cues.mjs build/head-to-head/assets-component-isolation-01 '+str(performance)+' 5'],'analysis':reason,'artifacts':artifacts,'decisions':[{'key':key,'disposition':'pursue' if passed else 'stop_current_profile','evidence_level':'actual_public_player_sourceproxy_comparison','new_media_execution':True,'reason':reason,'next_action':next_action,'whole_player_qualification':qualification,'stages':{'prepare':{'status':'passed','basis':'Actual source-only VP9 Cues rebuild from reused bounded EBML parsing/writing; original prebuilt index used only as independent oracle. Full construction costs charged.'},'correctness':{'status':'passed','basis':qualification['correctness']},'performance':{'status':'passed' if passed else 'failed','basis':reason}}}]})
itempath=home/'item.json';item=json.loads(itempath.read_text());item['whole_player_qualification']=qualification;itempath.write_text(json.dumps(item,indent=2)+'\n')
# Generated media remains local and reproducible; raw observations remain versioned.
inventory=pathlib.Path('research/reproducible-artifacts.json');d=json.loads(inventory.read_text());known={a['path']:a for a in d['artifacts']};ignore=pathlib.Path('research/.gitignore');text=ignore.read_text()
for directory in folders:
    for f in directory.glob('*.webm'):
        known[str(f)]={'path':str(f),'reason':'Deterministic source-only rebuilt Cues representation; retain observed measurements and checks separately.','recovery':[str(home/'tests/rebuild-cues.py'),str(home/'tests/whole-player-cues.mjs'),str(folder/'run.json'),'research/shared/runs/20260919T221240Z-virtual-cues-sized/cueless.webm'],'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
        line='/'+str(f).removeprefix('research/')
        if line not in text.splitlines():text+=line+'\n'
d['artifacts']=sorted(known.values(),key=lambda a:a['path']);inventory.write_text(json.dumps(d,indent=2)+'\n');ignore.write_text(text)
print(json.dumps({'run':str(folder),'status':qualification['status'],'benefit_gate':qualification['benefit_gate']}))
