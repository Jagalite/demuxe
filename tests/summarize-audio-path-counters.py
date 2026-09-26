# SPDX-License-Identifier: Apache-2.0
import json,sys
from pathlib import Path
p=Path(sys.argv[1]);data=json.loads(p.read_text());rows=[]
for t in data['trials']:
 if 'nativeBefore' not in t:continue
 a,b=t['nativeBefore'],t['nativeAfter'];elapsed=b['at']-a['at'];before={x['pid']:x for x in a['processes']};after={x['pid']:x for x in b['processes']};scale=a['timebase'][0]/a['timebase'][1]/1e9
 row={'lane':t['lane'],'accepted':t['accepted'],'cpu':t['cpu'],'nativeSeconds':elapsed,'roles':{}}
 for process in t['cpu']['perProcess']:
  pid=process['id'];x,y=before[pid],after[pid]
  if x['returnCode'] or y['returnCode']:raise RuntimeError('Native counters failed')
  role=row['roles'].setdefault(process['role'],dict(userSeconds=0,systemSeconds=0,instructions=0,cycles=0,wakeups=0))
  for target,source,factor in [('userSeconds','ri_user_time',scale),('systemSeconds','ri_system_time',scale),('instructions','ri_instructions',1),('cycles','ri_cycles',1),('wakeups','ri_interrupt_wkups',1)]:role[target]+=(y[source]-x[source])*factor
 for role in row['roles'].values():
  role['instructionsPerSecond']=role['instructions']/elapsed;role['activeGHz']=role['cycles']/max(1e-12,role['userSeconds']+role['systemSeconds'])/1e9;role['IPC']=role['instructions']/max(1,role['cycles'])
 rows.append(row)
p.with_name('counter-summary.json').write_text(json.dumps(rows,indent=2))
for r in rows:print(r['lane'],r['accepted'],'CPU',round(r['cpu']['oneCorePercent'] or 0,2),'renderer MIPS',round(r['roles'].get('renderer',{}).get('instructionsPerSecond',0)/1e6,2),'renderer GHz',round(r['roles'].get('renderer',{}).get('activeGHz',0),2))
