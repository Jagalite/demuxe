# SPDX-License-Identifier: Apache-2.0
"""Register a completed policy comparison and preserve earlier component evidence."""
import datetime,hashlib,importlib.util,json,pathlib,shutil,sys
root=pathlib.Path.cwd(); perf=pathlib.Path(sys.argv[1]);proof=pathlib.Path(sys.argv[2]);assets=pathlib.Path(sys.argv[3])
r=json.loads((perf/'result.json').read_text());assert r['passed'] and len(r['trials'])==20
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ');folder=pathlib.Path('research/shared/runs')/(stamp+'-whole-player-policies');folder.mkdir()
keys={'range128':'R003.coalesce-range-reads-around-useful-media-boundaries','paused-deadline':'R026.replace-polling-chains-with-bounded-credits-and-deadlines','rate-aware':'R049.size-lookahead-in-wall-clock-time-not-fixed-media-seconds'}
for name in ['prepare.py','measure.mjs','register.py']:
 shutil.copyfile(pathlib.Path(__file__).parent/name,folder/name)
shutil.copyfile('tests/head-to-head/server.mjs',folder/'server.mjs')
for mode in ['baseline',*keys]:
 d=folder/'snapshots'/mode;d.mkdir(parents=True)
 for name in ['manifest.json','demuxe/web/native-remux-player.js','demuxe/web/native-remux-source-worker.js']:
  p=d/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(assets/mode/name,p)
result={'scope':'Native remux -> Native remux; authored36s H264/AAC MPEGTS, Chrome headed/macOS. Whole-session open,1x,paused,0.5x after1x history,seek,2x EOF,cleanup. No production admission change.','results':r['comparisons'],'limits':r['protocol']['limits'],'browser_versions':sorted(set(x['browserVersion'] for x in r['trials']))}
(folder/'results.json').write_text(json.dumps(result,indent=2)+'\n')
artifacts=[]
failed=pathlib.Path('results/head-to-head/policy-player-performance-01')
for base in [failed,perf,proof,folder]:
 for p in sorted(base.rglob('*')):
  if not p.is_file():continue
  ext=p.suffix;license='Apache-2.0' if ext in ['.mjs','.py','.swift'] else 'GPL-3.0-or-later' if ext in ['.js','.html'] else 'CC-BY-4.0'
  artifacts.append({'path':str(p),'role':'immutable full-player observation, identity or source snapshot','license':license})
decisions=[]
for mode,key in keys.items():
 c=r['comparisons'][mode];passing=c['passed'];reason=f"Five paired actual-player comparisons completed after matching marked-output correctness. Primary {c['primary']} gate {'passed' if passing else 'failed'}; median paired deltas: {json.dumps(c['medianDeltas'],sort_keys=True)} percent. Minimum absolute saving {c['absoluteMinimum']}, measured {c['absoluteMedianReduction']}. Range candidate additionally requires every media-byte increase<=30%. "+result['scope']+' '+result['limits']+' Earlier component measurements remain historical and are not contradicted by a different whole-player scope.'
 decisions.append({'key':key,'disposition':'pursue' if passing else 'stop_current_profile','evidence_level':'scoped_whole_player_paired_comparison','candidate_executed':True,'reason':reason,'next_action':'Integrate only the qualified bounded policy with representative transport and lifecycle coverage, then remeasure before shipping.' if passing else 'Reopen only for an identified workload where the complete-player primary benefit can exceed the declared cost gate; retain component evidence.','stages':{'correctness':{'status':'passed','basis':'Matching exact-asset headed marked picture/audio, seek,rate,pause,EOF and cleanup checks; runtime measurements retain route/progression/drop/error/cleanup assertions.'},'performance':{'status':'passed' if passing else 'failed','basis':reason}}})
spec={'folder':str(folder),'stage':'whole-player policy comparison','items':list(keys.values()),'decisions':decisions,'artifacts':artifacts,'commands':[' '.join(r['command'])], 'analysis':'# Whole-player policy comparison\n\n'+result['scope']+'\n\nFive rotating rounds share same-round baseline. Every comparator uses the actual public Player and retained Native remux owner. Source and exact manifests retained. Correctness proof precedes timing. Primary gates are declared in the frozen measurement script. Negative full-player benefit outcomes do not erase prior component savings. The preserved performance-01 harness attempt requested unsupported4x and stopped; corrected admitted2x performance is a fresh run, not a candidate fix.\n\n'+ '\n\n'.join(d['key']+': '+d['reason'] for d in decisions)}
m=importlib.util.spec_from_file_location('record',root/'research/shared/tooling/record-research-stage.py');mod=importlib.util.module_from_spec(m);m.loader.exec_module(mod);mod.record(spec)
for mode,key in keys.items():
 p=root/'research/items'/key/'item.json';x=json.loads(p.read_text());x['whole_player_qualification']={'status':'measured_lab_benefit' if r['comparisons'][mode]['passed'] else 'benefit_gate_failed','tier_effect':'Native remux -> Native remux','production_admission_changed':False,'evidence':str(folder/'run.json'),'metrics':r['comparisons'][mode]};p.write_text(json.dumps(x,indent=2)+'\n')
print(folder)
