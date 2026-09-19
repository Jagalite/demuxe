import pathlib,json,hashlib,importlib.util,datetime,copy
r=pathlib.Path(__file__).resolve().parents[2]
s=importlib.util.spec_from_file_location('scr',r/'tools/screening.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
items=m.load(r);last=m.latest(r)
def get(n):return copy.deepcopy(next(d for k,d in last.items() if k.startswith(f'R{n:03}.')))
def record(d):
 m.validate_record(r,items,d);d['recorded_at_utc']=datetime.datetime.now(datetime.timezone.utc).isoformat();m.append(r,'state/decisions.jsonl',d)
old=pathlib.Path('results/local-screening');manifest=json.loads((old/'runs/engine-baseline/closeout-manifest.json').read_text())
files=['runs/direct-local-04/result.json','runs/r47-endurance-01/result.json','runs/engine-baseline/r47-comparison.json','runs/engine-baseline/r47-real-media-comparison.json']
identity=[];paths={}
for f in files:
 p=old/f;data=p.read_bytes();h=hashlib.sha256(data).hexdigest();expected=manifest['sourceAndEvidence'].get(str(p));assert expected is None or expected==h
 dest=r/'evidence/imports'/('reconciled__'+f.replace('/','__'));dest.write_bytes(data);paths[f]=str(dest.relative_to(r));identity.append({'original':str(p.resolve()),'copy':paths[f],'sha256':h,'prior_manifest_sha256':expected,'prior_match':expected==h if expected else None})
worker=hashlib.sha256(pathlib.Path('web/native-remux-worker.js').read_bytes()).hexdigest();assert worker==manifest['workerSHA256']
identity_path='work/reconciliation/local-identity.json';(r/identity_path).write_text(json.dumps({'files':identity,'worker_current_sha256':worker,'matches_prior_worker':True,'scope':'Raw local artifacts read and hash-checked; no playback, soak or benchmark rerun.'},indent=2)+'\n')
notes={
2:'Imported direct-local-04: retainedPreparation.surface and backend are true, direct lifecycle and missing-video rejection pass, workersAfter is zero. Confirms the narrow existing prepared-session promotion; no optional metadata or cross-backend sharing claim.',
40:'Imported direct-local-04 maintained component scrub: beforeCommit is empty, sole committed call and final position are 7.3, passed true. Existing input/change separation leaves no repeated backend preview work in this profile.',
47:'Current worker hash matches the prior isolated qualified worker. Imported exact captured output and append sizes match for both profiles; application gather bytes decrease 96.20% on the small fixture but only 8.96% on the movie, below its 25% value gate. Prior 100-cycle/1801.927-second run is retained historical evidence, not a v4 execution. Broad scatter/gather, CPU savings and production qualification are not established.'}
for n,note in notes.items():
 d=get(n);d['evidence_level']='IMPORTED_LOCAL_EVIDENCE';d['reason']+=' '+note;d['probe']['outcome']=d['reason'];d['probe']['method']='Source/current-owner review plus inspected prior raw local result and identity verification.';d['measurement']['result']=note;d['limits']=['No new playback, component scrub, benchmark or endurance execution for this item.','Imported scope does not establish general performance or release qualification.'];d['tested_profile']='Current owner plus imported local Chrome result at its recorded source/profile; no rerun.'
 d['evidence'].append({'path':identity_path,'note':'Copied local artifact identities and current R47 worker identity'})
 for f in files[:1] if n in [2,40] else files[1:]:d['evidence'].append({'path':paths[f],'note':'Inspected prior raw result; not newly executed'})
 record(d)
d=get(3);d['reason']=d['reason'].replace('cached 256KiB windows','cached windows (64KiB in the actual native-remux source worker; the generic RangeReader default is 256KiB)');d['observed_gap']=d['reason'];d['probe']['outcome']=d['reason'];d['current_code_paths'].append('web/native-remux-source-worker.js:15');d['evidence'].append({'path':'work/batch_e/r003-baseline-correction.md','note':'Actual remux owner overrides the generic reader default'});record(d)
api=json.loads((r/'evidence/prerequisites/api-gates.json').read_text());assert api['passed']
for n in [25,30]:
 d=get(n);d['evidence_level']='PREREQUISITE_PROBE';d['tested_profile']='Secure isolated localhost in installed headless Chrome '+api['browser']+'; no added experimental flags.';d['evidence'].append({'path':'evidence/prerequisites/api-gates.json','note':'Fresh window/worker API exposure; standard appendBuffer positive and nonexistent method adverse controls; teardown verified'})
 if n==30:
  d['decision']='HOLD_ENV';d['reason']='appendEncodedChunks is absent in both window and dedicated worker on the current default Chrome configuration; ordinary appendBuffer is present. No encoded-chunk candidate ran. Experimental feature enablement is a separate research configuration, not a negative mechanism result.'
 else:
  d['reason']='Current Chrome exposes legacy MediaStreamTrackGenerator in the window only; VideoTrackGenerator is absent in both contexts. This removes uncertainty about default exposure but leaves the reported write/stall and timestamp scheduling question unresolved. API presence alone does not justify a presenter benefit or working sink claim.'
 d['observed_gap']=d['reason'];d['probe']={'method':'Window and dedicated-worker API queries with known-present and nonexistent method controls','positive_control':'SourceBuffer.appendBuffer is function','negative_control':'Invented SourceBuffer.demuxeNonexistentProbeControl is undefined','outcome':d['reason']};d['measurement']['result']=d['reason'];d['limits']=['No frame write, encoded append, A/V playback or timing experiment executed.','No feature flags enabled and no route changes.'];record(d)
print('Reconciled local findings R02/R40/R47, corrected R03 baseline, probed R25/R30')
