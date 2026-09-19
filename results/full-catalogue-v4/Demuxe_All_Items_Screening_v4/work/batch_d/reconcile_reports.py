import pathlib,json,hashlib,importlib.util
P=pathlib.Path.cwd();W=P/'work/batch_d';ds=json.load(open(W/'decisions.json'));xs={x['key']:x for x in json.load(open(W/'assignment.json'))}
for d in ds:
 x=xs[d['key']];n=x['legacy_number'];p=P/d['evidence'][0]['path'];t=p.read_text()
 for r in x.get('related_reports',[]):
  text=''.join((P/r['path']).read_text().splitlines(True)[r['line_start']-1:r['line_end']]);t+=f'\n## Related historical result reconciled, not locally rerun\n\n{r["path"]}:{r["line_start"]}-{r["line_end"]}\n\n{text}\nRaw referenced historical runs were not supplied/inspected here. These are source assertions, not newly executed evidence.\n';d['evidence'].append({'path':r['path'],'sha256':hashlib.sha256((P/r['path']).read_bytes()).hexdigest(),'note':'Related historical result section read for this mechanism; raw historical run not independently verified'})
 if n==33:
  old=d['decision'];d['decision']='STOP_PROFILE';d['reason']='Related report explicitly records frag_interleave=1,2,4 losing AAC packets/tail and no earlier joint A/V; current code deliberately omits this option. Stop the reported settings/profile rather than repeat a known equivalence failure. This is a source-reconciled historical negative, not a new local experiment.';d['observed_gap']=d['reason'];d['next_test']='Reopen only for a materially different pinned-FFmpeg construction that first proves all AAC packet/sample counts, tail and PTS/DTS identical; then compare live joint A/V release. Do not rerun the same failed settings as if untouched.';d['reopen_condition']=d['next_test'];d['probe']['outcome']=d['reason'];t=t.replace('Decision: **'+old+'**','Decision: **STOP_PROFILE**');t+='\nReconciled disposition: '+d['reason']+'\nBounded reopening: '+d['next_test']+'\n'
 if n==333:
  old=d['decision'];d['decision']='STOP_PROFILE';d['reason']='Related report found one progressive reconstruction plus repeat timing, not duplicated field pictures; current player does not explicitly enable deinterlacing and forwards complete decoded images. No removable telecine stage is identified for this default progressive profile. This is not whole-browser cadence qualification.';d['observed_gap']=d['reason'];d['next_test']='Reopen only on a trace showing duplicate reconstructions/uploads or actual deinterlace work for an admitted progressive-repeat source; then compare cadence/audio with genuinely interlaced control and no timestamp double-counting.';d['reopen_condition']=d['next_test'];d['probe']['outcome']=d['reason'];t=t.replace('Decision: **'+old+'**','Decision: **STOP_PROFILE**');t+='\nReconciled disposition: '+d['reason']+'\nBounded reopening: '+d['next_test']+'\n'
 if n==289:
  t+='\nCurrent shared prerequisite was inspected earlier: VideoDecoder exists on secure localhost Chrome 152. Therefore the historical opaque-origin/admin blocker is not the current decision; the absent independent-job service is setup work.\n'
 p.write_text(t);d['evidence'][0]['sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('s',P/'tools/screening.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
for d in ds:s.validate_record(P,list(xs.values()),d)
(W/'decisions.json').write_text(json.dumps(ds,indent=2)+'\n')
from collections import Counter
print(dict(Counter(d['decision'] for d in ds)))
