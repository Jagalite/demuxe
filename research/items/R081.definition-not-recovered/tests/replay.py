# SPDX-License-Identifier: Apache-2.0
"""R081 actual software entropy decode followed by CPU/GPU reconstruction."""
import pathlib,sys,subprocess,json,time
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True)
base=pathlib.Path('research/items/R129.extend-gpu-reconstruction-from-still-pictures-to-predictive-video/tests')
commands=[['python3',str(base/'prepare.py'),str(p)],['node',str(base/'gpu-owned.mjs'),str(p)]]
rows=[]
for cmd in commands:
 t=time.perf_counter();r=subprocess.run(cmd,capture_output=True,text=True);rows.append({'command':cmd,'exit':r.returncode,'elapsedMs':(time.perf_counter()-t)*1000,'stdout':r.stdout,'stderr':r.stderr})
 if r.returncode:break
(p/'execution.json').write_text(json.dumps(rows,indent=2)+'\n')
if any(r['exit'] for r in rows):raise SystemExit(1)
x=json.loads((p/'browser-results.json').read_text());times=x['probe']['rows'];import statistics
ratios=[r['candidateMs']/r['baselineMs'] for r in times];out={'correctness':x['passed'],'scope':'Reuses actual MPEG2 entropy parser and independently FFmpeg-decoded DC-I/chroma-aligned motion P profile. GPU inverse DC and resident prediction replace CPU software reconstruction, not video presentation only. R081 title-derived scope, not recovery of an original detailed report.','pairedMedianRatio':statistics.median(ratios),'performancePassed':statistics.median(ratios)<=.95,'pairs':len(times),'allFramesExact':all(x['probe']['all33FramesExact']),'allTimedOutputsExact':x['probe']['all22TimedOutputsExact'],'wholePreparationMs':rows[0]['elapsedMs'],'limitations':'Restricted AC-zero I and motion-only P. No arbitrary MPEG2, H264, HDR or automatic routing qualification. Shared entropy preparation charged equally; cold device/pipelines, uploads, dispatch, final readback and cleanup included in component comparison.'}
(p/'r081-results.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
