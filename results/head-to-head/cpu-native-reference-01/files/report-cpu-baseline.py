#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Render per-fixture cross-player CPU reductions; never replace correctness outcomes."""
import argparse
import hashlib
import shutil
import json
import os
import statistics
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE_LABELS = {'aac-mp4':'H.264 + AAC / MP4','aac-mkv':'H.264 + AAC / MKV',
               'pcm-mkv':'H.264 + PCM24 / MKV','pcm-ass':'H.264 + PCM24 / MKV + ASS'}
PLAYERS = [('video','Native video'),('movi','Movi'),('libmedia','AVPlayer')]

def comparison(demuxe, baseline):
    for records in (demuxe, baseline):
        if len(records) < 3 or any(r['status'] != 'passed' or not r.get('measurement') for r in records):
            return {'status':'unmeasured','reason':'Three complete accepted rounds required'}
        if len({r['round'] for r in records}) != len(records):
            return {'status':'unmeasured','reason':'Duplicate round'}
    a={r['round']:r for r in demuxe};b={r['round']:r for r in baseline}
    if set(a)!=set(b): return {'status':'unmeasured','reason':'Round sets differ'}
    pairs=[]
    for round_id in sorted(a):
        x=a[round_id]['measurement']['oneCorePercent'];y=b[round_id]['measurement']['oneCorePercent']
        if not (0 <= x < float('inf') and 0 < y < float('inf')):
            return {'status':'unmeasured','reason':'Invalid CPU denominator or measurement'}
        pairs.append({'round':round_id,'demuxeOneCorePercent':x,'baselineOneCorePercent':y,
                      'gainPercent':100*(y-x)/y,'demuxeRecord':a[round_id]['recordPath'],'baselineRecord':b[round_id]['recordPath']})
    gains=[p['gainPercent'] for p in pairs]
    return {'status':'measured','medianGainPercent':statistics.median(gains),'minGainPercent':min(gains),
            'maxGainPercent':max(gains),'demuxeMedianCPU':statistics.median(p['demuxeOneCorePercent'] for p in pairs),
            'baselineMedianCPU':statistics.median(p['baselineOneCorePercent'] for p in pairs),'pairs':pairs}

def render(args):
    assets=Path(args.assets).resolve();out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=False)
    fixtures={k:{'label':v} for k,v in BASE_LABELS.items()}
    fixtures.update(json.loads((assets/'fixtures/catalogue.json').read_text()))
    runs=[]
    for name in args.correctness+args.performance:
        run=Path(name).resolve()
        subprocess.run(['node',str(ROOT/'tests/head-to-head/verify.mjs'),str(run)],check=True,stdout=subprocess.DEVNULL)
        data=json.loads((run/'summary.json').read_text());runs.append((run,data))
    correctness={};performance={}
    for run,data in runs:
        for c in data['cases']:
            key=(c['fixture'],c['player'])
            if c['lane'] not in ('default','auto'):continue
            if data['kind']=='correctness':correctness[key]=(run,data,c)
            else:performance.setdefault(key,[]).append((run,data,c))
    rows=[]
    for key,fixture in fixtures.items():
        row={'fixture':key,'label':fixture['label'],'comparisons':{}}
        for player,title in PLAYERS:
            blocked=fixture.get('blockedReason') or fixture.get('qualificationLimit')
            pairkeys=[(key,'demuxe'),(key,player)]
            reason=blocked
            if not reason:
                for pk in pairkeys:
                    record=correctness.get(pk)
                    if not record:reason=f'{pk[1]}: no matching fresh correctness';break
                    if record[2]['status']!='passed':reason=f"{pk[1]} correctness {record[2]['status']}: {record[2].get('reason','') .splitlines()[0]}";break
            if reason:result={'status':'unmeasured','reason':reason}
            else:
                groups=[performance.get(pk,[]) for pk in pairkeys]
                valid=all(groups)
                for pk,group in zip(pairkeys,groups):
                    proof=correctness[pk][1]
                    for _,identity,c in group:
                        valid &= identity.get('kind')=='performance' and all(identity.get(k)==proof.get(k) for k in ('assetsSHA256','harnessSHA256','browserIdentity'))
                if groups[0] and groups[1]:
                    valid &= all(groups[0][0][1].get(k)==groups[1][0][1].get(k) for k in ('assetsSHA256','harnessSHA256','browserIdentity'))
                result=comparison(*[[c for _,_,c in group] for group in groups]) if valid else {'status':'unmeasured','reason':'Missing performance or mismatched identities'}
                if result['status']=='measured':
                    result['runs']=[str(g[0][0].relative_to(ROOT)) for g in groups]
                else:
                    failures=[c.get('reason','') .splitlines()[0] for group in groups for _,_,c in group if c['status']!='passed' and c.get('reason')]
                    if failures: result['reason']='; '.join(dict.fromkeys(failures))
            row['comparisons'][player]=result
        rows.append(row)
    result={'schema':1,'formula':'100 * (baseline CPU - Demuxe CPU) / baseline CPU',
            'aggregation':'median of matched-round percentage reductions, separately per fixture and comparator',
            'assets':str(assets.relative_to(ROOT)),'runs':[str(p.relative_to(ROOT)) for p,_ in runs],'rows':rows}
    (out/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
    def cell(c):return f"{c['medianGainPercent']:+.1f}%" if c['status']=='measured' else 'N/A'
    lines=['# Cross-player CPU baseline','',
           'Positive gain means lower Demuxe CPU; negative means higher Demuxe CPU. Each value is the median of three matched-round reductions, never an average across media formats. A round range crossing zero is directionally inconsistent; three rounds are not a significance test.',
           '', 'Pinned Movi 0.4.0 and AVPlayer 1.3.1; current frozen Demuxe; Chrome headed on this shared macOS host. These versions reproduce the README comparison, not latest-release claims.',
           '', '36-second synthetic fixtures; 5-second warmup and 20-second scored windows; three rotating orders grouped by fixture, fresh browser per trial. CPU includes CDP-listed Chrome processes, excludes server/external media services/energy. Background processes remain running. Renderer counters differ by path and do not certify physical smoothness. Audio-only results have no video cadence gate. No device, high-resolution, endurance or universal ranking claim.',
           '', 'Original correctness-table outcomes are preserved. Failed, fidelity-blocked, missing-counter, incomplete-round and mismatched-identity cases receive N/A, never zero gain.',
           '', '| Media | vs Native video | vs Movi | vs AVPlayer |','| --- | --- | --- | --- |']
    for row in rows:lines.append('| '+row['label']+' | '+' | '.join(cell(row['comparisons'][p]) for p,_ in PLAYERS)+' |')
    lines += ['', '## Per-comparison measurements and exclusions','', '| Media / comparator | CPU: Demuxe / baseline (% of one core) | Median gain; round range | Evidence or reason |','| --- | --- | --- | --- |']
    for row in rows:
        for player,title in PLAYERS:
            c=row['comparisons'][player]
            if c['status']=='measured':
                run=ROOT/c['runs'][0]
                link=os.path.relpath(run/'summary.json',out)
                lines.append(f"| {row['label']} / {title} | {c['demuxeMedianCPU']:.2f} / {c['baselineMedianCPU']:.2f} | {c['medianGainPercent']:+.1f}%; {c['minGainPercent']:+.1f} to {c['maxGainPercent']:+.1f}% | [raw rounds]({link}) |")
            else:lines.append(f"| {row['label']} / {title} | — | N/A | {c['reason'].replace('|','/')} |")
    lines += ['', '## Verified run inputs', '']
    for run,data in runs: lines.append(f"- [{run.name}]({os.path.relpath(run/'REPORT.md',out)}): {data['kind']}, {data.get('browserIdentity','unknown browser')}.")
    (out/'REPORT.md').write_text('\n'.join(lines)+'\n')
    (out/'files').mkdir();shutil.copyfile(__file__,out/'files/report-cpu-baseline.py')
    source_hashes={str(p.relative_to(ROOT)):{'summarySHA256':hashlib.sha256((p/'summary.json').read_bytes()).hexdigest(),'manifestSHA256':hashlib.sha256((p/'manifest.json').read_bytes()).hexdigest()} for p,_ in runs}
    (out/'inputs.json').write_text(json.dumps(source_hashes,indent=2)+'\n')
    (out/'manifest.json').write_text(json.dumps({'sha256':{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}},indent=2)+'\n')
    if args.update_readme:
        p=ROOT/'README.md';text=p.read_text();mapping={r['label']:r for r in rows};updated=[]
        for line in text.splitlines():
            if line.startswith('| '):
                cells=line.split('|');label=cells[1].strip()
                if label in mapping:cells[-2]=' '+' / '.join(cell(mapping[label]['comparisons'][player]) for player,_ in PLAYERS)+' ';line='|'.join(cells)
            updated.append(line)
        text='\n'.join(updated)+'\n'
        text=text.replace('**Cross-player CPU gains remain\nunmeasured.**', '**Cross-player CPU baseline:** see the per-comparator values below; N/A means no qualified comparison.')
        marker='**CPU gain order:**'
        note=f"{marker} Native video / Movi / AVPlayer. Positive = lower Demuxe CPU, negative = higher. Median of matched-round percentage reductions; N/A is not zero. [Raw CPU baseline and exclusions]({out.relative_to(ROOT)}/REPORT.md).\n\n"
        assert marker not in text,'CPU baseline note already exists; review before replacing a baseline'
        text=text.replace('| Media format |',note+'| Media format |',1);p.write_text(text)
    print(json.dumps({'rows':len(rows),'measuredComparisons':sum(c['status']=='measured' for r in rows for c in r['comparisons'].values()),'report':str(out)},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--assets',required=True);p.add_argument('--correctness',action='append',default=[]);p.add_argument('--performance',action='append',default=[]);p.add_argument('--output',required=True);p.add_argument('--update-readme',action='store_true');render(p.parse_args())
