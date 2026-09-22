# SPDX-License-Identifier: Apache-2.0
"""Summarize retained component trials, refusing to turn failed trials into gains."""
import hashlib,json,pathlib,statistics,sys,shutil
root=pathlib.Path('results/head-to-head')
out=pathlib.Path(sys.argv[1]);out.mkdir();(out/'files').mkdir()
load=lambda p:json.loads(p.read_text())
rows=[
 ('pcm-ass','subtitles','Default external ASS ownership is mpv; the optional independent Native libass renderer needs explicit admission.','subtitles'),
 ('h264-ac3','audio','Selected AC-3 audio produces no Native decoded-audio progress; video is presented.','audio'),
 ('h264-eac3','audio','Selected E-AC-3 audio produces no Native decoded-audio progress; video is presented.','audio'),
 ('h264-dts','audio','Selected DTS audio produces no Native decoded-audio progress; no DTS packet-copy mux contract exists.','audio'),
 ('hevc10-ac3','audio','Selected AC-3 audio fails Native verification; HEVC video is presented.','audio'),
 ('hevc10-eac3','audio','Selected E-AC-3 audio fails Native verification; HEVC video is presented.','audio'),
 ('hevc10-dts','audio','Selected DTS audio fails Native verification; HEVC video is presented; no DTS packet-copy mux contract exists.','audio'),
 ('h264-srt','subtitles','Selected embedded SRT is not delivered by the admitted Native subtitle path; unchanged MKV A/V works.','subtitles'),
 ('h264-movtext','subtitles','Selected embedded tx3g requires extraction; unchanged MP4 A/V works. Only text/timing equivalence is qualified.','subtitles'),
 ('h264-ass','subtitles','Embedded ASS requires independent extraction and libass composition; unchanged MKV A/V works.','subtitles'),
 ('hevc-pgs','subtitles + audio','PGS composition is not provided by Native; direct Native also presents video but fails AC-3 audio. Hybrid itself misses the authored drawing.','audio'),
 ('h264-vobsub','subtitles + audio','VobSub composition is not provided by Native; direct Native also presents video but fails AC-3 audio.','audio'),
 ('hdr10-hevc','audio + fidelity','E-AC-3 audio fails Native verification; HDR transfer/display fidelity remains independently unqualified.','audio'),
 ('dash-h264','streaming / timing','Native has no admitted MPD segment/timeline owner. Finite MSE trial passes; Hybrid baseline times out on pause after marked A/V.','dash'),
 ('dash-av1','streaming / timing','MPD segment/timeline ownership, not AV1/Opus decoding, excludes Native; finite MSE trial passes.','dash'),
 ('hls-live','streaming / timing','Live manifest ownership is gated. Direct Native trial plays initially but stops advancing during the rate test.','direct'),
]
runs={'baseline':load(root/'component-isolation-baseline-02/summary.json'),'baselineFocused':load(root/'component-isolation-baseline-03/summary.json'),'subtitles':load(root/'component-subtitles-trial-02/summary.json'),'audio':load(root/'component-audio-trial-01/summary.json'),'dash':load(root/'component-dash-trial-02/summary.json'),'direct':load(root/'component-live-trial-01/summary.json')}
paths={'baseline':'component-isolation-baseline-02','baselineFocused':'component-isolation-baseline-03','subtitles':'component-subtitles-trial-02','audio':'component-audio-trial-01','dash':'component-dash-trial-02','direct':'component-live-trial-01'}
fixtures=load(pathlib.Path('build/head-to-head/assets-component-isolation-01/fixtures/catalogue.json'))
records=[];raw=[]
for id,category,cause,trial in rows:
 base=next((c for c in runs['baselineFocused']['cases'] if c['fixture']==id),None);baseKey='baselineFocused'
 if base is None:base=next(c for c in runs['baseline']['cases'] if c['fixture']==id);baseKey='baseline'
 candidate=next(c for c in runs[trial]['cases'] if c['fixture']==id)
 record={'id':id,'label':fixtures[id]['label'],'blockerCategory':category,'exactBlocker':cause,'qualificationLimit':fixtures[id].get('qualificationLimit'),'currentOwners':{'video':'browser WebCodecs','audio':'mpv PCM/worklet','subtitles':'mpv/libass or bitmap renderer' if id in ['pcm-ass','h264-srt','h264-movtext','h264-ass','hevc-pgs','h264-vobsub'] else 'none','demux':'mpv/FFmpeg','presentation':'Demuxe retained-frame presenter'},'baseline':{'path':str(root/paths[baseKey]/base['recordPath']),'status':base['status'],'screenPassed':base.get('screenPassed',False),'reason':base.get('reason'),'playerCleanup':base.get('cleanup'),'workersAfter':base.get('workersAfter')},'trial':{'strategy':trial,'path':str(root/paths[trial]/candidate['recordPath']),'status':candidate['status'],'reason':candidate.get('reason'),'rateAdvance':candidate.get('rateAdvance')},'performance':None}
 nativeState=base.get('eof',base.get('initial',base.get('failureState',{}))) or {}
 record['nativeFailureEvidence']=[{'error':f['error'],'capability':f['diagnostics'].get('capability'),'rendered':f['diagnostics'].get('rendered')} for f in nativeState.get('nativeVerificationFailures',[])]
 if id in ['hevc-pgs','h264-vobsub']:
  direct=next(c for c in load(root/'component-bitmap-direct-01/summary.json')['cases'] if c['fixture']==id)
  record['directDiagnostic']={'path':str(root/'component-bitmap-direct-01'/direct['recordPath']),'status':direct['status'],'reason':direct.get('reason'),'nativeFailureEvidence':direct.get('failureState',{}).get('nativeVerificationFailures',[])}
 if candidate['status']=='passed':
  record['trial']['owners']={'video':'browser media element','audio':'browser media element','subtitles':'independent libass' if id in ['h264-ass','pcm-ass'] else 'browser text track' if trial=='subtitles' else 'none','demux':'browser A/V + bounded JS subtitle extraction' if id in ['h264-srt','h264-movtext','h264-ass'] else 'browser segments + bounded JS MPD/MSE loader' if trial=='dash' else 'browser','presentation':'browser media element + libass overlay' if id in ['h264-ass','pcm-ass'] else 'browser media element'}
 attempts=sorted(root.glob('component-performance-'+id+'-*/result.json'));perfPath=attempts[-1] if attempts else root/('component-performance-'+id+'-01')/'result.json'
 if perfPath.exists():
  perf=load(perfPath);record['performanceAttempt']={'path':str(perfPath),'passed':perf.get('passed'),'error':perf.get('error')}
  if perf.get('passed'):
   assert base['status']==candidate['status']=='passed'
   record['performance']={'path':str(perfPath),'pairs':perf['pairs'],'medianPairedDeltaPercent':{metric:statistics.median(p['metrics'][metric]['deltaPercent'] for p in perf['pairs']) for metric in perf['pairs'][0]['metrics']}}
   for r in perf['rounds']:
    expected=base['eof']['route'] if r['variant']=='baseline' else candidate['eof']['route']
    assert all(s['state']['route']==expected for s in [r['open'],*r['samples'],r['eof']])
    assert all(s['state']['route']==expected for s in r['seeks'])
    assert not r['browserTeardown']['remainingProcessIDs']
    raw.append({'id':id,'pair':r['round'],'variant':r['variant'],'startupWallMs':r['startupWallMs'],'startupCPUSeconds':r['startupCPUSeconds'],**r['steady'],'seeks':r['seeks'],'observedWork':r['observedWork']})
 if record['performance'] is None:
  record['cpuNotMeasuredReason']=('Replacement failed: '+candidate.get('reason','').split('\n')[0]) if candidate['status']!='passed' else 'Hybrid baseline failed its correctness/cleanup gate; no paired CPU claim.' if base['status']!='passed' else 'Performance attempt failed: '+str(record.get('performanceAttempt',{}).get('error')) if record.get('performanceAttempt') else 'Not measured.'
 records.append(record)
assert len(records)==16
(out/'analysis.json').write_text(json.dumps({'scope':'Explicit lab trials; unchanged production routing; bounded synthetic equivalence only','cases':records,'rawPerformance':raw},indent=2)+'\n')
lines=['<!-- SPDX-License-Identifier: CC-BY-4.0 -->','','# Remaining Hybrid component study','','Negative deltas mean lower CPU/RSS. Dashes mean no qualified paired measurement, never zero. All successful replacements are explicit lab routes; automatic routing is unchanged.','','| Case | Exact blocker | Replacement trial | CPU delta | Summed RSS delta |','| --- | --- | --- | --- | --- |']
for r in records:
 p=r['performance'];trial=r['trial'];detail='Pass (bounded fixture)' if trial['status']=='passed' else trial['reason'].split('\n')[0].replace('page.evaluate: PlayerError: ','').replace('FFmpeg error -1094995529: ','')
 d=p['medianPairedDeltaPercent'] if p else {};cpu=f"{d['oneCorePercent']:+.1f}%" if p else '—';rss=f"{d['peakSummedRssKiB']:+.1f}%" if p else '—'
 lines.append(f"| {r['label']} | {r['blockerCategory']}: {r['exactBlocker']} | {detail} | {cpu} | {rss} |")
lines+=['','## Component owners after successful substitution','','| Case | Video owner | Audio owner | Subtitle owner | Demux / manifest owner | Presentation owner |','| --- | --- | --- | --- | --- | --- |']
for r in records:
 if 'owners' in r['trial']:
  o=r['trial']['owners'];lines.append('| '+' | '.join([r['label'],o['video'],o['audio'],o['subtitles'],o['demux'],o['presentation']])+' |')
lines+=['','## Raw paired measurements','','CPU is percent of one core. RSS is MiB, summed across listed Chrome processes. Each row is one end-to-end player trial: startup, steady playback, seeks and EOF; it is not an uninterrupted full-file timing or a helper microbenchmark.','','| Case | Pair | Variant | Startup wall ms | Startup CPU s | Steady CPU % | Peak summed RSS MiB |','| --- | --- | --- | --- | --- | --- | --- |']
for r in raw:lines.append(f"| {r['id']} | {r['pair']} | {r['variant']} | {r['startupWallMs']:.3f} | {r['startupCPUSeconds']:.3f} | {r['oneCorePercent']:.3f} | {r['peakSummedRssKiB']/1024:.3f} |")
lines+=['','Full per-pair differences for startup wall/CPU, steady CPU, summed RSS and main-thread work, plus raw seek costs, process samples, exposed copy/renderer counters and evidence paths are in [analysis.json](analysis.json) and the linked per-case performance records. Percentages are not combined across formats.']
(out/'REPORT.md').write_text('\n'.join(lines)+'\n')
shutil.copy2(__file__,out/'files'/pathlib.Path(__file__).name)
files={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()}
(out/'manifest.json').write_text(json.dumps({'sha256':files},indent=2)+'\n')
print(out)
