# SPDX-License-Identifier: Apache-2.0
"""Strict FIFO video-surface join; refuses gaps instead of guessing nearest events."""
import json,re,sys,statistics
from pathlib import Path
folder=Path(sys.argv[1]);events=json.loads((folder/'trace.json').read_text())['traceEvents']
sub=[e for e in events if e['name']=='VideoFrameSubmitter::SubmitFrame']
quads=[e for e in events if e['name']=='VideoFrameResourceProvider::AppendQuads']
sources=[]
for q in quads:
 s=[e for e in sub if e['pid']==q['pid'] and e['tid']==q['tid'] and e['ts']<=q['ts'] and e['ts']+e.get('dur',0)>=q['ts']+q.get('dur',0)]
 assert len(s)==1,('ambiguous source submit',q)
 match=re.search(r'timestamp:(\d+)',s[0]['args']['frame'])
 sources.append({'submit':s[0]['ts'],'pts':int(match[1]) if match else None,'pid':s[0]['pid']})
sources.sort(key=lambda x:x['submit']);assert len({s['pid'] for s in sources})==1
pipeline=[e for e in events if 'chrome_graphics_pipeline' in e.get('args',{})]
receives=[e for e in pipeline if e['args']['chrome_graphics_pipeline']['step']=='STEP_RECEIVE_COMPOSITOR_FRAME' and e['args']['chrome_graphics_pipeline'].get('frame_sink_id',{}).get('frame_sink_id')==2147483648]
receives.sort(key=lambda e:e['ts']);assert len(receives)==len(sources),(len(receives),len(sources));assert len({str(e['args']['chrome_graphics_pipeline']['frame_sink_id']) for e in receives})==1
by_surface={}; manual=[]
for src,recv in zip(sources,receives):
 assert recv['ts']>=src['submit'],('FIFO causality violated',src,recv)
 key=recv['args']['chrome_graphics_pipeline']['surface_frame_trace_id']
 row={**src,'surface_frame_trace_id':key,'receive':recv['ts'],'displayed':[]}
 if key==-1:
  acts=[e for e in events if e['name']=='Surface::ActivateFrame' and e['pid']==recv['pid'] and e['tid']==recv['tid'] and recv['ts']<=e['ts']<=recv['ts']+recv.get('dur',0) and '2147483648)' in e.get('args',{}).get('SurfaceId','')]
  assert len(acts)==1,('manual surface did not activate exactly once',recv,acts)
  row['activated']=acts[0]['ts'];row['surface_id']=acts[0]['args']['SurfaceId'];row['gpuPID']=recv['pid'];row['gpuTID']=recv['tid'];manual.append(row)
 else:
  assert key not in by_surface;by_surface[key]=row
for a in pipeline:
 p=a['args']['chrome_graphics_pipeline']
 if p['step']!='STEP_SURFACE_AGGREGATION':continue
 draw=[e for e in pipeline if e['args']['chrome_graphics_pipeline']['step']=='STEP_DRAW_AND_SWAP' and e['args']['chrome_graphics_pipeline'].get('display_trace_id')==p['display_trace_id']]
 assert len(draw)==1
 d=draw[0];begin=[e for e in events if e['name']=='Graphics.Pipeline.DrawAndSwap' and e['ph']=='b' and e['pid']==d['pid'] and d['ts']<=e['ts']<=d['ts']+d['dur']]
 assert len(begin)==1
 b=begin[0];end=[e for e in events if e['name']=='Graphics.Pipeline.DrawAndSwap' and e['ph']=='e' and e['pid']==b['pid'] and e['id2']==b['id2'] and e['ts']>=b['ts']]
 next_begin=min([e['ts'] for e in events if e['name']=='Graphics.Pipeline.DrawAndSwap' and e['ph']=='b' and e['pid']==b['pid'] and e['id2']==b['id2'] and e['ts']>b['ts']],default=float('inf'))
 end=[e for e in end if e['ts']<next_begin]
 assert len(end)==1,('display feedback pair',b,end)
 for key in p['aggregated_surface_frame_trace_ids']:
  if key in by_surface:by_surface[key]['displayed'].append(end[0]['ts'])
  elif key==-1 and manual:
   assert p['aggregated_surface_frame_trace_ids'].count(-1)==1,'ambiguous manual source'
   active=[r for r in manual if r['activated']<=a['ts'] and r['gpuPID']==a['pid'] and r['gpuTID']==a['tid']]
   assert active,'no activated manual source'
   max(active,key=lambda r:r['activated'])['displayed'].append(end[0]['ts'])
joined=list(by_surface.values())+manual;unique={}
for row in joined:
 if row['displayed'] and row['pts'] is not None:unique.setdefault(row['pts'],min(row['displayed']))
pts=sorted(unique);phases=[unique[t]-t for t in pts];offset=statistics.median(phases);errors=[v-offset for v in phases];gaps=[(unique[b]-unique[a])-(b-a) for a,b in zip(pts,pts[1:])]
out={'method':'Single video submitter and frame sink; complete success-only AppendQuads and receive counts matched in Mojo FIFO order; exact surface-frame IDs join aggregation, exact display async IDs join feedback. For manual -1 IDs, require exactly one source surface and activation within every receive; replay its active generation on the same GPU thread at aggregation. No cross-thread nearest-time matching.','sourceSubmissions':len(sources),'receivedSurfaces':len(receives),'displayedUniquePTS':len(unique),'undisplayedSubmissions':sum(not r['displayed'] for r in joined),'rows':joined,'phaseOffsetUs':offset,'phaseP95AbsUs':sorted(map(abs,errors))[int(.95*(len(errors)-1))],'cadenceIntervalErrorRMSUs':statistics.mean(g*g for g in gaps)**.5,'monotonicDisplayedPTS':all(unique[a]<unique[b] for a,b in zip(pts,pts[1:])),'physicalOverlayPromotion':'not observed by this trace; presentation feedback is distinct from overlay promotion'}
(folder/'display-join.json').write_text(json.dumps(out,indent=2)+'\n');print({k:v for k,v in out.items() if k not in ('rows','method')})
