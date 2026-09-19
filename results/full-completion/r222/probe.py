# SPDX-License-Identifier: Apache-2.0
import pathlib,subprocess,json,hashlib,copy
root=pathlib.Path(__file__).resolve().parent.parent;source=root/'r59/two-tail.mp4';target=root/'r59/selected-reference.mp4';sha=lambda b:hashlib.sha256(b).hexdigest()
def inspect(p):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_streams','-show_data_hash','sha256','-of','json',str(p)]))
a,b=inspect(source),inspect(target);rows=[]
for src,dst in [(0,0),(2,1)]:
 ap=[p for p in a['packets'] if p['stream_index']==src];bp=[p for p in b['packets'] if p['stream_index']==dst];assert len(ap)==len(bp)
 for x,y in zip(ap,bp):rows.append({'source_stream':src,'target_stream':dst,'source_offset':int(x['pos']),'target_offset':int(y['pos']),'size':int(x['size']),'hash':x['data_hash'],'pts':x['pts'],'dts':x['dts'],'duration':x['duration']})
proof={'source_sha256':sha(source.read_bytes()),'target_sha256':sha(target.read_bytes()),'config':{str(dst):a['streams'][src].get('extradata_hash') for src,dst in [(0,0),(2,1)]},'rows':rows}
def verify(p):
 # Re-inspect bytes independently, not producer-supplied offsets or hashes.
 actual_source,actual_target=inspect(source),inspect(target);sb=source.read_bytes();tb=target.read_bytes()
 if p['source_sha256']!=sha(sb) or p['target_sha256']!=sha(tb):return False
 actual={(x['stream_index'],int(x['pos'])):x for x in actual_target['packets']};origin={(x['stream_index'],int(x['pos'])):x for x in actual_source['packets']}
 if len(p['rows'])!=len(actual):return False
 seen=set()
 for row in p['rows']:
  key=(row['target_stream'],row['target_offset']);x=origin.get((row['source_stream'],row['source_offset']));y=actual.get(key)
  if key in seen or not x or not y:return False
  seen.add(key)
  for field in ['pts','dts','duration']:
   if row[field]!=x[field] or row[field]!=y[field]:return False
  size=row['size']
  if size!=int(x['size']) or size!=int(y['size']):return False
  if 'SHA256:'+sha(sb[row['source_offset']:row['source_offset']+size])!=row['hash'] or 'SHA256:'+sha(tb[row['target_offset']:row['target_offset']+size])!=row['hash']:return False
  cfg=p['config'][str(row['target_stream'])]
  if cfg!=actual_source['streams'][row['source_stream']].get('extradata_hash') or cfg!=actual_target['streams'][row['target_stream']].get('extradata_hash'):return False
 return True
assert verify(proof)
mutants={}
p=copy.deepcopy(proof);p['rows'][0]['source_offset']+=1;mutants['wrong-offset']=p
p=copy.deepcopy(proof);p['rows'][0]['target_offset'],p['rows'][1]['target_offset']=p['rows'][1]['target_offset'],p['rows'][0]['target_offset'];mutants['swapped-output-range']=p
p=copy.deepcopy(proof);p['rows'][0]['pts']+=1;mutants['wrong-timestamp']=p
p=copy.deepcopy(proof);p['config']['0']='SHA256:'+'0'*64;mutants['wrong-config']=p
p=copy.deepcopy(proof);p['source_sha256']='0'*64;mutants['stale-source']=p
rejected={k:not verify(v) for k,v in mutants.items()};assert all(rejected.values())
r=root/'r222';(r/'construction-record.json').write_text(json.dumps(proof,indent=2)+'\n');(r/'result.json').write_text(json.dumps({'scope':'Local finite MP4 selected packet-copy construction, independent byte ranges plus ffprobe packet/config/timing oracle; not a proof for arbitrary muxers or source authorization.','rows':len(rows),'valid_accepted':True,'mutations_rejected':rejected,'passed':True},indent=2)+'\n');print(json.dumps({'rows':len(rows),'rejected':rejected}))
