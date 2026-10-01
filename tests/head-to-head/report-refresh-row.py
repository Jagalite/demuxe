#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Prepare compact audited row evidence; apply only when explicitly requested."""
import argparse,gzip,hashlib,json,math,pathlib,shutil,statistics,subprocess,tarfile
ROOT=pathlib.Path(__file__).resolve().parents[2]
MAIN={'auto':2,'jspi':3,'asyncify':4,'software':5}
PRIVATE=['hybrid-jspi','hybrid-asyncify','software-jspi','software-asyncify']
def digest(data):return hashlib.sha256(data).hexdigest()
def validate_label(fixture,captured,displayed):
    assert captured==displayed or (fixture,captured,displayed)==('pcm-ass','H.264 + PCM24 / MKV + external ASS','H.264 + PCM24 / MKV + ASS'),'Fixture label does not match selected README row'
def load_run(directory):
    directory=directory.resolve()
    subprocess.run(['node',str(ROOT/'tests/head-to-head/verify.mjs'),str(directory)],check=True,stdout=subprocess.DEVNULL)
    data=json.loads((directory/'summary.json').read_bytes())
    assert data.get('finishedAt') and not data.get('interrupted'),'Incomplete campaign'
    return data
def selected_cases(proofs):
    selected={}
    for proof in proofs:
        assert proof['kind']=='correctness'
        for case in proof['cases']:
            assert case['player']=='demuxe' and case['lane'] in [*MAIN,*PRIVATE],'Unexpected lane'
            assert case['id'] not in selected,'Duplicate proof; explicitly choose the final corrected campaign'
            selected[case['id']]=(proof,case)
    assert len({c['fixture'] for _,c in selected.values()})==1,'One fixture required'
    return selected
def cpu_cells(selected,cpu_runs):
    windows={}
    for run in cpu_runs:
        assert run['kind']=='performance'
        if not run.get('browserIdentity'):
            assert run.get('cases') and all(c['status']=='failed' and c.get('failureStage')=='setup' and not any(c.get(k) for k in ['measurement','samples','initial','browserIdentity','screenMeasured']) for c in run['cases']),'Unidentified browser can only preserve rejected CPU setup evidence'
            blocks=run.get('browserBlocks',[])
            assert blocks and all(b.get('status')=='failed' and b.get('arms')==0 and b.get('startupReadiness',{}).get('status')=='failed' and b['startupReadiness'].get('traceStopped') is True and b['startupReadiness'].get('completedTask') is None for b in blocks),'Missing rejected browser startup evidence'
        for case in run['cases']:
            assert case['id'] in selected,'CPU case lacks selected correctness proof'
            proof,correct=selected[case['id']]
            assert all(run.get(k) and run[k]==proof[k] for k in ['assetsSHA256','harnessSHA256']),'CPU identity differs from its captured correctness harness'
            if run.get('browserIdentity'):
                assert run['browserIdentity']==proof['browserIdentity'],'CPU browser differs from its captured correctness harness'
            windows.setdefault(case['id'],[]).append(case)
    results={}
    for identity,(proof,case) in selected.items():
        good=case['status']=='passed' or case['status']=='blocked' and case.get('screenPassed') and not case.get('failureStage')
        rounds=windows.get(identity,[])
        if rounds:assert good and not case.get('runtimeBypass') and case.get('runtimeCPUApplicable') is not False,'CPU cannot qualify a failed/bypassed correctness case'
        accepted=[r for r in rounds if r.get('measurement') and (r['status']=='passed' or r['status']=='blocked' and r.get('screenMeasured') and not r.get('failureStage'))]
        if rounds and len(accepted)==len(rounds) and len(rounds)>=3:
            assert {r['round'] for r in rounds}==set(range(1,len(rounds)+1)),'Duplicate or missing CPU rounds'
            values=[r['measurement']['oneCorePercent'] for r in accepted]
            assert all(isinstance(v,(float,int)) and math.isfinite(v) and v>=0 for v in values),'Invalid CPU value'
            results[identity]={'status':'accepted','rounds':len(values),'oneCorePercent':values,'medianOneCorePercent':statistics.median(values)}
            if case.get('audioTrackTransitions'):
                track=case.get('initial',{}).get('selectedAudioTrack')
                assert track and track.get('id') and track.get('codec'),'Missing initial audio identity for multi-track CPU'
                states=[s.get('state') for r in accepted for s in r.get('samples',[])]
                assert all(r.get('samples') for r in accepted) and states,'Missing measured audio-track samples'
                assert all(s and (s.get('selectedAudioTrack') or {}).get('id')==track['id'] and s['selectedAudioTrack'].get('codec')==track['codec'] for s in states),'CPU measured another or unknown audio track'
                results[identity]['initialAudioTrack']=track
                results[identity]['sampleRoutes']=sorted({s['route'] for s in states if s.get('route')})
        elif rounds:
            rejected=[r for r in rounds if r not in accepted]
            reasons=[str(r.get('reason','Rejected CPU round')).splitlines()[0] for r in rejected]
            if not rejected:reasons=[f'Incomplete CPU rounds: {len(accepted)} accepted; at least 3 required']
            results[identity]={'status':'withheld','reasons':reasons,'rounds':len(rounds)}
        else:results[identity]={'status':('outside-scope' if case['lane'] in PRIVATE else 'pending') if good else 'not-applicable'}
    return results
def cell(case,cpu):
    if case.get('runtimeBypass'):return 'N/A · runtime bypass'
    good=case['status']=='passed' or case['status']=='blocked' and case.get('screenPassed') and not case.get('failureStage')
    if not good:return '🔴 (Fail)' if case['status']=='failed' else '— Blocked'
    label='🟡 Screened*' if case.get('screenPassed') else '🟢 (Pass)'
    label+=' · '+(f"{cpu['medianOneCorePercent']:.1f}% CPU" if cpu['status']=='accepted' else 'not measured (outside CPU campaign scope)' if cpu['status']=='outside-scope' else 'CPU '+cpu['status'])
    if cpu.get('initialAudioTrack'):label+=' · initial '+cpu['initialAudioTrack']['codec'].upper()
    if case.get('forceRemux'):label+=' · forced-remux ref'
    return label
def route_reason(case):
    detail=(case['route']+'; ' if case['route'] else '')+case['reason']
    if case['cpu']['status']=='withheld':detail+='; CPU withheld: '+'; '.join(case['cpu']['reasons'])
    transitions=case.get('audioTrackTransitions',[])
    if transitions:
        detail+='; audio selections: '+', '.join(str(t.get('requestedCodec','unknown')).upper()+' via '+str(t.get('route','unknown')) for t in transitions)
        if case['cpu'].get('initialAudioTrack'):detail+='; CPU measures initial '+case['cpu']['initialAudioTrack']['codec'].upper()+' only'
    return detail.replace('|','/')
def validate_audit(audit,directories,proofs):
    assert audit.get('passed') is True,'Supplemental audit did not pass'
    summaries={str(pathlib.Path(s['path']).resolve()):s['sha256'] for s in audit.get('summaries',[])}
    checks={str(pathlib.Path(c['path']).resolve()):c for c in audit.get('cases',[])}
    for directory,proof in zip(directories,proofs):
        directory=directory.resolve()
        summary=directory/'summary.json';assert summaries.get(str(summary))==digest(summary.read_bytes()),'Audit does not bind supplied correctness summary'
        for case in proof['cases']:
            good=case['status']=='passed' or case['status']=='blocked' and case.get('screenPassed') and not case.get('failureStage')
            if not good:continue
            path=directory/case['recordPath'];check=checks.get(str(path))
            assert check and check['sha256']==digest(path.read_bytes()) and check['id']==case['id'],'Audit case identity differs from selected proof'
            assert check.get('accepted') is True and check.get('samples')==case.get('rateSamples'),'Audit does not accept exact recorded rate samples'
            if 'summarySHA256' in check:assert check['summarySHA256']==digest(summary.read_bytes()),'Audit case binds another summary'
def archive_run(directory,destination):
    destination.mkdir()
    summary=(directory/'summary.json').read_bytes();manifest=(directory/'manifest.json').read_bytes()
    (destination/'summary.json.gz').write_bytes(gzip.compress(summary,mtime=0))
    (destination/'manifest.json').write_bytes(manifest)
    assets=(directory/'assets-manifest.json').read_bytes();(destination/'assets-manifest.json.gz').write_bytes(gzip.compress(assets,mtime=0))
    assert gzip.decompress((destination/'summary.json.gz').read_bytes())==summary and gzip.decompress((destination/'assets-manifest.json.gz').read_bytes())==assets,'Compact roundtrip changed original data'
    source_hashes={}
    with tarfile.open(destination/'captured-harness.tar.gz','w:gz') as archive:
        for file in sorted((directory/'files/harness').rglob('*')):
            assert not file.is_symlink(),'Harness cannot contain symlinks'
            if file.is_file():
                name=str(file.relative_to(directory/'files/harness'));source_hashes[name]=digest(file.read_bytes())
                assert json.loads(manifest)['sha256']['files/harness/'+name]==source_hashes[name],'Captured source differs from original manifest'
                archive.add(file,arcname=name,recursive=False)
    with tarfile.open(destination/'captured-harness.tar.gz','r:gz') as archive:
        members=archive.getmembers();assert len(members)==len(source_hashes) and len({m.name for m in members})==len(members)
        for member in members:assert member.isfile() and member.name in source_hashes and digest(archive.extractfile(member).read())==source_hashes[member.name],'Captured harness roundtrip differs'
    return {'originalDirectory':str(directory.relative_to(ROOT)),'summarySHA256':digest(summary),'manifestSHA256':digest(manifest),'capturedHarnessFiles':source_hashes,'compactFiles':{p.name:digest(p.read_bytes()) for p in destination.iterdir()}}
def prepare(args):
    directories=args.correctness+args.cpu;proofs=[load_run(p) for p in args.correctness];cpu=[load_run(p) for p in args.cpu]
    selected=selected_cases(proofs);fixture=next(iter(selected.values()))[1]['fixture']
    contract=json.loads((args.correctness[0]/'files/harness/matrix.json').read_text())['fixtures'][fixture]
    streaming=bool(contract.get('streamFormat') or contract.get('live'))
    expected={'auto','software'} if streaming else {*MAIN,*PRIVATE}
    assert {c['lane'] for _,c in selected.values()}==expected,'Missing lane proof; require all8, or exact2 streaming lanes'
    assert len({p['assetsSHA256'] for p in proofs})==1 and len({p['browserIdentity'] for p in proofs})==1,'Mixed player/fixture/browser snapshots'
    cpus=cpu_cells(selected,cpu)
    original=(ROOT/'README.md').read_text();lines=original.splitlines();header=next(i for i,l in enumerate(lines) if l.startswith('| Media format | Native video |'))
    index=header+1+args.row;assert lines[index].startswith('| ');cells=[c.strip() for c in lines[index].strip('|').split('|')];assert len(cells)==10
    validate_label(fixture,contract.get('label'),cells[0])
    cases=[]
    for identity,(proof,case) in selected.items():
        published=cell(case,cpus[identity]);lane=case['lane']
        if lane in MAIN:cells[MAIN[lane]]=published
        cases.append({'id':identity,'lane':lane,'status':case['status'],'cell':published,'reason':str(case.get('reason','Bounded playback checks passed')).splitlines()[0],'route':case.get('initial',{}).get('route'),'runtimeObservations':case.get('runtimeObservations',[]),'runtimeBypass':case.get('runtimeBypass',False),'cpu':cpus[identity],'correctnessHarnessSHA256':proof['harnessSHA256'],'canonicalCaseSHA256':digest(json.dumps(case,sort_keys=True,separators=(',',':')).encode())})
        if case.get('audioTrackTransitions'):
            cases[-1]['initialAudioTrack']=case.get('initial',{}).get('selectedAudioTrack')
            cases[-1]['audioTrackTransitions']=case['audioTrackTransitions']
    if streaming:
        for lane in ['jspi','asyncify']:cells[MAIN[lane]]='N/A · finite-file scope'
    replacement='| '+' | '.join(cells)+' |';lines[index]=replacement
    refresh_note='The [October 2026 row refresh](docs/README-REFRESH-20261001.md) identifies the current captured player source, browser and per-row evidence. Other cells retain their historical campaigns; nonisolated Hybrid/Software observations are reported separately.'
    if refresh_note not in original:lines[header:header]=[refresh_note,'']
    args.output.mkdir(parents=True,exist_ok=False)
    runs=[archive_run(p,args.output/f'run-{n:02d}') for n,p in enumerate(directories,1)]
    retained=[]
    for n,p in enumerate(args.retained_run,1):
        load_run(p);retained.append(archive_run(p,args.output/f'retained-run-{n:02d}'))
    audits=[]
    for n,p in enumerate(args.audit,1):
        raw=p.read_bytes();audit=json.loads(raw);validate_audit(audit,args.correctness,proofs)
        name=f'supplemental-audit-{n:02d}.json.gz';(args.output/name).write_bytes(gzip.compress(raw,mtime=0));fact={'originalPath':str(p.relative_to(ROOT)),'sha256':digest(raw),'compactFile':name,'compactSHA256':digest((args.output/name).read_bytes())}
        if audit.get('helper'):
            helper=pathlib.Path(audit['helper']['path']).resolve();helper_bytes=helper.read_bytes();assert helper.suffix=='.mjs' and helper.is_relative_to(ROOT/'tests/head-to-head') and digest(helper_bytes)==audit['helper']['sha256'],'Audit validator identity changed'
            helper_name=f'supplemental-validator-{n:02d}.mjs';(args.output/helper_name).write_bytes(helper_bytes);fact['validator']={'file':helper_name,'sha256':digest(helper_bytes)}
        audits.append(fact)
    receipt={'schema':1,'row':args.row,'label':cells[0],'fixture':fixture,'scope':'Bounded marked-output and lifecycle correctness; CPU only for exact matching assets/browser/captured harness. Separate nonisolated lanes do not replace README Auto/Software/remux cells. No release or broad-codec claim.','assetsSHA256':proofs[0]['assetsSHA256'],'browserIdentity':proofs[0]['browserIdentity'],'playerSourceRevision':proofs[0].get('playerSourceRevision'),'streaming':streaming,'cases':cases,'runs':runs,'readmeBeforeSHA256':digest(original.encode()),'originalRow':original.splitlines()[index],'replacementRow':replacement,'publicationPath':str(args.publish_to.relative_to(ROOT))}
    receipt['retainedHistoricalRuns']=retained
    receipt['supplementalAudits']=audits
    (args.output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    details=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','',f"## Row {args.row}: {cells[0]}",'',f"Browser: {receipt['browserIdentity']}. Player source: `{receipt['playerSourceRevision']}`.",'',receipt['scope'],'','[Compact evidence](receipt.json)']
    if audits:details+=['','Browser and CPU results retain their original captured harness. The later supplemental validator audits the same recorded rate samples; these runs did not execute that newer validator.']
    if retained:details+=['','Earlier attempts and their original failure reasons are retained unchanged as historical evidence. They are excluded from the selected current proof.']
    details+=['','### README lanes','','| Lane | Result | Route / reason |','| --- | --- | --- |']
    for c in cases:
        if c['lane'] in MAIN:details.append(f"| {c['lane']} | {c['cell']} | {route_reason(c)} |")
    details+=['','### Nonisolated observations','','| Mode / runtime | Result | Route / reason |','| --- | --- | --- |']
    for lane in PRIVATE:
        c=next((c for c in cases if c['lane']==lane),None);details.append(f"| {lane} | {c['cell'] if c else 'N/A · finite-file scope'} | {route_reason(c) if c else 'Streaming excluded from this lane'} |")
    (args.output/'row-observations.md').write_text('\n'.join(details)+'\n')
    (args.output/'README.proposed-row.txt').write_text(replacement+'\n')
    if args.apply:
        assert all(c['cpu']['status']!='pending' for c in cases if c['lane'] in MAIN and not c['runtimeBypass']),'Finish matching main-lane CPU gates before publication'
        assert digest((ROOT/'README.md').read_bytes())==receipt['readmeBeforeSHA256'],'README changed during preparation'
        assert not args.publish_to.exists(),'Preserve published historical evidence'
        args.publish_to.parent.mkdir(parents=True,exist_ok=True);shutil.copytree(args.output,args.publish_to)
        report=ROOT/'docs/README-REFRESH-20261001.md';heading=f"## Row {args.row}: {cells[0]}";prior=report.read_text() if report.exists() else '<!-- SPDX-License-Identifier: CC-BY-4.0 -->\n\n# October 2026 README refresh\n'
        assert heading not in prior,'Row already published; preserve it and use a reviewed correction'
        embedded=(args.output/'row-observations.md').read_text().replace('[Compact evidence](receipt.json)',f'[Compact evidence](../{args.publish_to.relative_to(ROOT)}/receipt.json)')
        report.write_text(prior+'\n'+embedded);(ROOT/'README.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'prepared':str(args.output),'applied':args.apply,'row':args.row,'fixture':fixture,'cases':len(cases)}))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--row',type=int,required=True);p.add_argument('--correctness',action='append',required=True,type=lambda v:pathlib.Path(v).resolve());p.add_argument('--cpu',action='append',default=[],type=lambda v:pathlib.Path(v).resolve());p.add_argument('--audit',action='append',default=[],type=lambda v:pathlib.Path(v).resolve());p.add_argument('--retained-run',action='append',default=[],type=lambda v:pathlib.Path(v).resolve());p.add_argument('--output',required=True,type=lambda v:pathlib.Path(v).resolve());p.add_argument('--publish-to',required=True,type=lambda v:pathlib.Path(v).resolve());p.add_argument('--apply',action='store_true');a=p.parse_args();assert 1<=a.row<=80;prepare(a)
