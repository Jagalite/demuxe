# SPDX-License-Identifier: Apache-2.0
"""Freeze R048 observations and append a scoped whole-player decision."""
import pathlib,json,hashlib,datetime,shutil,sys,importlib.util
root=pathlib.Path.cwd();key='R048.keep-only-the-relevant-native-caption-cues-instantiated'
prepared,proof,performance=map(pathlib.Path,sys.argv[1:4]);data=json.loads((performance/'result.json').read_text());assert data['passed']
correct=json.loads((proof/'result.json').read_text());assert correct['passed']
folder=pathlib.Path(sys.argv[4]) if len(sys.argv)>4 else pathlib.Path('research/items')/key/'evidence'/(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-whole-player-cues');folder.mkdir(parents=True,exist_ok=True);assert not (folder/'run.json').exists()
for name in ['snapshots','variants']: (folder/name).mkdir(exist_ok=True)
for p in (pathlib.Path('research/items')/key/'tests').glob('whole-player-*'):
 if p.is_file():shutil.copy2(p,folder/'snapshots'/p.name)
for n in ['01','02','03','04']:
 source=pathlib.Path('build/research-r048-correctness-'+n)
 if source.exists():shutil.copytree(source,folder/'variants'/('correctness-'+n),dirs_exist_ok=True)
for n in ['01','02']:
 source=pathlib.Path('build/research-r048-cues-'+n);dest=folder/'variants'/('owner-'+n);dest.mkdir(exist_ok=True)
 for p in source.rglob('*'):
  if p.is_file() and p.suffix in ['.js','.mjs','.json'] and p.name!='oracle.json':
   target=dest/p.relative_to(source);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
shutil.copytree(performance,folder/'performance',dirs_exist_ok=True)
benefit=data['primaryPassed'];status='measured_lab_benefit' if benefit else 'benefit_gate_failed'
comparisons=data['comparisons'];numbers='; '.join(f"versus {arm}: median startup saving {v['median']['startupSavingPercent']:.3f}% ({v['median']['startupSavingMs']:.3f}ms), open-through-EOF CPU change {v['median']['openThroughEOFCPUChangePercent']:.3f}%, peak summed RSS saving {v['median']['memorySavingPercent']:.3f}% ({v['median']['memorySavingKiB']:.1f}KiB)" for arm,v in comparisons.items())
reason='Actual maintained Native direct player with authored10000-cue ordered plain external captions, identical bounded SRT-to-VTT preparation in all arms, and unchanged H264/stereoAAC ownership. Candidate retained at most11 VTTCues versus10000 in shipping Blob-loaded and cheaper JS-eager controls. Five forward/backward seeks matched authored active intervals/text and visible subtitle pixels exactly; independent wrong-source text changed9606 caption channels; overlap rejected with prior-owner preservation, source replacement/stale events, delayed-read cancellation, EOF and cleanup passed. Five alternating three-arm whole-player trials: '+numbers+'. Primary startup and whole-session CPU tradeoff gates '+('passed' if benefit else 'failed')+'. Cue count is not a memory measurement; retained full caption source/parsed records remain charged.'
next_action=('Keep explicit bounded ownership; qualify representative long-form captions and production cancellation/selection integration before changing default admission.' if benefit else 'Do not integrate this whole-player profile on the historical component saving alone. Reopen with a representative workload demonstrating meaningful startup or total-memory benefit against the cheapest correct eager owner without a meaningful session CPU regression.')
qualification={'status':status,'tier_effect':'Native -> Native','production_admission_changed':False,'candidate_executed':True,'correctness':'passed','performance':'passed' if benefit else 'failed','scope':'Authored10000-cue ordered nonoverlap plain caption document attached to36s H264/stereoAAC; prepared Player module, complete owner open/attachment/continuousplayback/seek/EOF/cleanup','comparisons':comparisons,'limits':['No arbitrary styles, overlaps, remux timeline or ordinary short-caption benefit claim','Five pairs on shared Chrome/macOS host, not population confidence or physical energy','Browser startup, shared API import before timer, external media services and serverCPU excluded; summedRSS can doublecount sharedpages','Initial unloaded-track owner failure and two ineffective paused-text mutation controls preserved; final control uses wrong immutable source text']}
(folder/'results.json').write_text(json.dumps({'whole_player_qualification':qualification,'reason':reason,'next_action':next_action},indent=2)+'\n')
artifacts=[]
for p in folder.rglob('*'):
 if p.is_file():
  head=p.read_bytes()[:300] if p.suffix in ['.js','.mjs','.py'] else b''
  license='GPL-3.0-or-later' if b'GPL-3.0-or-later' in head else 'Apache-2.0' if p.suffix in ['.js','.mjs','.py'] else 'CC-BY-4.0'
  artifacts.append({'path':str(p),'license':license,'role':'immutable source or actual observation'})
known={a['path'] for a in artifacts}
for c in correct['cases']:
 for p,h in c['assets'].items():
  rel=str(pathlib.Path(p).resolve().relative_to(root))
  if rel not in known:
   head=pathlib.Path(p).read_bytes()[:300] if pathlib.Path(p).suffix in ['.js','.mjs'] else b''
   license='GPL-3.0-or-later' if b'GPL-3.0-or-later' in head else 'Apache-2.0' if b'Apache-2.0' in head else 'CC-BY-4.0' if pathlib.Path(p).suffix in ['.mp4','.srt'] else 'NOASSERTION'
   artifacts.append({'path':rel,'license':license,'role':'actual served source or authored media fixture'});known.add(rel)
fragment=[]
for n in ['01','02']:
 for name in ['captions.srt','oracle.json']:
  p=pathlib.Path('build/research-r048-cues-'+n)/name;fragment.append({'path':str(p),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'reason':'Generated original caption data retained locally in ignored build scope','recovery':[str(folder/'snapshots/whole-player-prepare.py')]})
(folder/'regenerable-artifacts.json').write_text(json.dumps({'schema':1,'artifacts':fragment},indent=2)+'\n');artifacts.append({'path':str(folder/'regenerable-artifacts.json'),'license':'CC-BY-4.0','role':'regenerated caption fixture inventory'})
spec={'folder':str(folder),'stage':'whole-player qualification','status':'completed','commands':[f'python3 research/items/{key}/tests/whole-player-prepare.py build/research-r048-cues-01',f'python3 research/items/{key}/tests/whole-player-prepare.py build/research-r048-cues-02']+[f'node research/items/{key}/tests/whole-player-correctness.mjs build/research-r048-cues-'+('01' if n=='01' else '02')+' build/research-r048-correctness-'+n for n in ['01','02','03','04']]+[f'node research/items/{key}/tests/whole-player-measure.mjs {prepared} {proof} {performance} --exclusive'],'analysis':reason+'\n\n'+next_action,'artifacts':artifacts,'decisions':[{'key':key,'disposition':'pursue' if benefit else 'stop_current_profile','evidence_level':'actual_whole_player_three_arm_comparison','reason':reason,'next_action':next_action,'whole_player_qualification':qualification,'stages':{'prepare':{'status':'passed','basis':'Frozen native runtime plus isolated derived caption owner; same10000cue document/parser/source in shipping, cheaper eager, and bounded window arms.'},'correctness':{'status':'passed','basis':'Actual visible subtitle equivalence, authored interval/text oracle, wrong-source output detection and owner lifecycle controls passed in final corrected variant.'},'performance':{'status':'passed' if benefit else 'failed','basis':'Five three-arm whole-player trials; primary startup >=10% and20ms plus4/5 faster against bothbaselines, with meaningful CPU regression guard. '+numbers}}}]}
m=importlib.util.spec_from_file_location('record','research/shared/tooling/record-research-stage.py');module=importlib.util.module_from_spec(m);m.loader.exec_module(module);module.record(spec)
p=pathlib.Path('research/items')/key/'item.json';item=json.loads(p.read_text());item['whole_player_qualification']={**qualification,'evidence':[str(folder/'run.json')]};p.write_text(json.dumps(item,indent=2)+'\n')
print(folder)
