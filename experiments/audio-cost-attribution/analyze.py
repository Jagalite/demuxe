#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Disjoint thread-CPU accounting. Nested trace durations are never added twice.
Thread CPU (tts/tdur) excludes descheduled/waiting wall time. Missing coverage
is explicitly retained, rather than assigned to a decoder or AudioWorklet.
"""
import json,sys,collections,statistics,pathlib
root=pathlib.Path(sys.argv[1]);r=json.loads((root/'result.json').read_text())
def union(intervals):
 intervals=sorted((a,b) for a,b in intervals if b>a);out=[]
 for a,b in intervals:
  if out and a<=out[-1][1]:out[-1]=(out[-1][0],max(b,out[-1][1]))
  else:out.append((a,b))
 return out
def length(intervals):return sum(b-a for a,b in union(intervals))
def overlap(a,b):
 a,b=union(a),union(b);i=j=0;total=0
 while i<len(a) and j<len(b):
  total+=max(0,min(a[i][1],b[j][1])-max(a[i][0],b[j][0]))
  if a[i][1]<b[j][1]:i+=1
  else:j+=1
 return total
rows=[]
for trial in r['trials']:
 if 'nativeBefore' not in trial:continue
 a,b=trial['nativeBefore'],trial['nativeAfter'];before={p['pid']:p for p in a['processes']};after={p['pid']:p for p in b['processes']};seconds=b['at']-a['at'];scale=a['timebase'][0]/a['timebase'][1]/1e9
 roles={}
 for p in trial['cpu']['perProcess']:
  x,y=before[p['id']],after[p['id']];assert not(x['returnCode'] or y['returnCode'])
  role=roles.setdefault(p['role'],dict(instructions=0,cycles=0,cpuSeconds=0))
  role['instructions']+=y['ri_instructions']-x['ri_instructions'];role['cycles']+=y['ri_cycles']-x['ri_cycles'];role['cpuSeconds']+=((y['ri_user_time']+y['ri_system_time'])-(x['ri_user_time']+x['ri_system_time']))*scale
 for v in roles.values():v['MIPS']=v['instructions']/seconds/1e6;v['activeGHz']=v['cycles']/max(v['cpuSeconds'],1e-9)/1e9
 rows.append(dict(lane=trial['lane'],accepted=trial['accepted'],cpu=trial['cpu'],roles=roles,frames=trial['frames'],drops=trial['drops']))
summary={'trials':rows,'groups':{}}
for lane in dict.fromkeys(x['lane'] for x in rows):
 group=[x for x in rows if x['lane']==lane and x['accepted']];
 if group:summary['groups'][lane]={'n':len(group),'chromeCPU':[x['cpu']['oneCorePercent'] for x in group],'rendererCPU':[x['cpu']['roles']['renderer'] for x in group],'rendererMIPS':[x['roles']['renderer']['MIPS'] for x in group],'rendererGHz':[x['roles']['renderer']['activeGHz'] for x in group]}
(root/'counter-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary['groups'],indent=2))
if not (root/'trace.json').exists():sys.exit()
trace=json.loads((root/'trace.json').read_text())['traceEvents'];marks=[];names={}
for e in trace:
 if e.get('name')=='thread_name':names[e['pid'],e['tid']]=e.get('args',{}).get('name','unknown')
 msg=e.get('args',{}).get('data',{}).get('message')
 if isinstance(msg,str) and msg.startswith('attribution:'):marks.append({**e,'tag':msg})
start=next(e for e in marks if e['tag']=='attribution:window:start');end=next(e for e in marks if e['tag']=='attribution:window:end');lo,hi=start['ts'],end['ts'];renderer=start['pid'];seconds=(hi-lo)/1e6
rolemap={};worker_records=r['trace']['workers']
for e in marks:
 if e['tag'].startswith('attribution:thread:'):
  index=int(e['tag'].rsplit(':',1)[1]);rolemap[e['pid'],e['tid']]=worker_records[index]['url']
def kind(key):
 name=names.get(key,'unknown');url=rolemap.get(key,'')
 if 'filter-retained-engine-worker' in url:return 'mpv bridge worker'
 if 'native-remux-source-worker' in url:return 'video source worker'
 if 'native-remux-worker' in url:return 'video packet preparation worker'
 if 'engine-selective/' in url:return 'mpv Wasm pthread (decoder/runtime not separated)'
 if 'io-worker' in url:return 'mpv source IO worker'
 if 'AudioWorklet' in name:return 'AudioWorklet thread'
 if 'AudioOutputDevice' in name:return 'Web Audio output-device thread'
 if key==(renderer,start['tid']):return 'renderer main (shared control/presentation)'
 return name
bythread=collections.defaultdict(list)
for e in trace:
 if e.get('pid')==renderer and 'tts' in e and lo<=e.get('ts',0) and e.get('ts',0)+e.get('dur',0)<=hi:bythread[e['pid'],e['tid']].append(e)
account=[];details=[]
for key,events in bythread.items():
 cpuLo=min(e['tts'] for e in events);cpuHi=max(e['tts']+e.get('tdur',0) for e in events);span=max(0,cpuHi-cpuLo);x=[e for e in events if e.get('ph')=='X' and 'tdur' in e]
 totalX=length([(e['tts'],e['tts']+e['tdur']) for e in x]);name=kind(key);buckets={}
 if name=='AudioWorklet thread':
  script=[(e['tts'],e['tts']+e['tdur']) for e in x if e['name']=='AudioWorkletProcessor::Process (author script execution)'];buckets['worklet author execution (includes V8 entry wrapper)']=length(script);buckets['browser worklet graph/runtime outside author execution']=max(0,span-length(script))
 elif name=='mpv bridge worker':
  intervals={};pending={}
  for e in sorted((e for e in marks if (e['pid'],e['tid'])==key and 'tts' in e and lo<=e['ts']<=hi),key=lambda e:e['ts']):
   bits=e['tag'].split(':')
   if len(bits)==3 and bits[1] in ['pump','events']:
    phase=bits[1]
    if bits[2]=='begin':pending[phase]=e['tts']
    elif bits[2]=='end' and phase in pending:intervals.setdefault(phase,[]).append((pending.pop(phase),e['tts']))
  pump,ev=intervals.get('pump',[]),intervals.get('events',[]);assert overlap(pump,ev)==0
  buckets['PCM pump incl. copying, metadata and feedback']=length(pump);buckets['mpv event fetch/parse/dispatch']=length(ev);buckets['other bridge worker/runtime']=max(0,span-length(pump)-length(ev))
 else:buckets[name]=span
 assert abs(sum(buckets.values())-span)<1e-6
 for label,us in buckets.items():account.append({'category':label,'cpuMs':us/1000,'oneCorePercent':us/1e6/seconds*100,'tid':key[1]})
 top=collections.defaultdict(lambda:[0,0])
 for e in x:top[e['name']][0]+=1;top[e['name']][1]+=e['tdur']
 details.append({'tid':key[1],'threadName':names.get(key),'role':name,'workerURL':rolemap.get(key),'observedCpuSpanMs':span/1000,'completeEventUnionCpuMs':totalX/1000,'firstWallUs':min(e['ts'] for e in events),'lastWallUs':max(e['ts']+e.get('dur',0) for e in events),'topInclusiveEvents_NOT_ADDITIVE':sorted([{'name':n,'count':v[0],'inclusiveCpuMs':v[1]/1000} for n,v in top.items()],key=lambda e:-e['inclusiveCpuMs'])[:25]})
bracket=r['trace']['bracketCpu'];proc=next(p for p in bracket['perProcess'] if p['id']==renderer);observed=sum(x['cpuMs'] for x in account);denominator=proc['cpuSeconds']*1000
analysis={'scope':'Instrumented observation; thread-clock spans can miss untraced edge work. CDP bracket is slightly wider. Missing CPU is not allocated by guess. Custom pump/event markers add trace-only overhead. Worklet author slice includes its V8 wrapper.','rendererPid':renderer,'wallSeconds':seconds,'bracketWallSeconds':bracket['wallSeconds'],'rendererBracketCpuMs':denominator,'observedRendererCpuMs':observed,'uncoveredOrBoundaryCpuMs':denominator-observed,'traceMarkerCount':len(marks),'markersWithThreadClock':sum('tts' in e for e in marks),'bracketProcessCPU':bracket,'components':sorted(account,key=lambda e:-e['cpuMs']),'threads':sorted(details,key=lambda e:-e['observedCpuSpanMs'])}
if 'threadBefore' in r['trace']:
 a,b=r['trace']['threadBefore'],r['trace']['threadAfter'];wall=b['at']-a['at'];native=[];issues=[]
 prior={p['pid']:p for p in a['processes']}
 for p in b['processes']:
  if p['errno'] or p['pid'] not in prior:issues.append(p);continue
  old=prior[p['pid']];threads={t['tid']:t for t in old['threads']};remaining=set(threads)
  for t in p['threads']:
   prev=threads.get(t['tid']);remaining.discard(t['tid'])
   if prev is None or prev['errno'] or t['errno']:issues.append({'pid':p['pid'],'before':prev,'after':t});continue
   ms=(t['userNs']+t['systemNs']-prev['userNs']-prev['systemNs'])/1e6;assert ms>=0
   native.append({'pid':p['pid'],'tid':t['tid'],'name':t['name'],'role':kind((p['pid'],t['tid'])),'cpuMs':ms,'oneCorePercent':ms/1000/wall*100})
  if remaining:issues.append({'pid':p['pid'],'lostThreads':list(remaining)})
 analysis['nativeThreads']={'scope':'OS per-thread CPU across a slightly wider interval than trace markers; sleeping time excluded; no Mach timebase scaling for proc_threadinfo nanoseconds','wallSeconds':wall,'snapshotDurationsMs':[(v['endAt']-v['at'])*1000 for v in (a,b)],'issues':issues,'rows':sorted(native,key=lambda e:-e['cpuMs'])}
 parts=[]
 for t in native:
  if t['pid']!=renderer:continue
  detail=[c for c in account if c['tid']==t['tid']]
  if t['role']=='AudioWorklet thread':
   author=next(c['cpuMs'] for c in detail if c['category'].startswith('worklet author'))
   assert author>0 and author<=t['cpuMs']
   buckets={'worklet author execution including V8 wrapper':author,'browser worklet graph/runtime and trace-boundary remainder':t['cpuMs']-author}
  elif t['role']=='mpv bridge worker':
   pump=next(c['cpuMs'] for c in detail if c['category'].startswith('PCM pump'));events=next(c['cpuMs'] for c in detail if c['category'].startswith('mpv event'))
   assert pump>0 and events>0 and pump+events<=t['cpuMs']
   buckets={'PCM pump including metadata and feedback':pump,'mpv event fetch/parse/dispatch':events,'other bridge runtime and trace-boundary remainder':t['cpuMs']-pump-events}
  else:buckets={t['role'] if t['role']!='unknown' else 'unmapped '+t['name']:t['cpuMs']}
  parts.extend({'category':label,'tid':t['tid'],'cpuMs':ms,'oneCorePercent':ms/1000/wall*100} for label,ms in buckets.items())
 analysis['nativeRendererComponents']=sorted(parts,key=lambda v:-v['cpuMs'])
 analysis['nativeRendererCpuMs']=sum(p['cpuMs'] for p in parts)
 analysis['nativeRendererCoverageOfWiderCDPBracket']=analysis['nativeRendererCpuMs']/denominator
assert observed<=denominator*1.05, 'Trace CPU exceeds process budget; investigate clock scope before claiming attribution'
(root/'trace-attribution.json').write_text(json.dumps(analysis,indent=2)+'\n')
print('TRACE CPU',denominator,observed,'uncovered',denominator-observed)
for x in analysis['components']:print(x['category'],round(x['cpuMs'],3),round(x['oneCorePercent'],3))
