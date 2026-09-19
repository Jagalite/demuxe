# SPDX-License-Identifier: Apache-2.0
import json,datetime,hashlib
from pathlib import Path
root=Path(__file__).parent
campaign=json.loads((root/'campaign.json').read_text())
def record(prefix,state,evidence,reason,level='COMPONENT_TEST'):
 matches=[i for i in campaign['items'] if i['key'].startswith(prefix)];assert len(matches)==1,(prefix,matches)
 paths=evidence if isinstance(evidence,list) else [evidence]
 row={'key':matches[0]['key'],'rank':matches[0]['rank'],'state':state,'reason':reason,'evidence_level':level,'evidence':[{'path':p,'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in paths],'recorded_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 with (root/'decisions.jsonl').open('a') as f:f.write(json.dumps(row)+'\n')
