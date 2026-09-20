# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import json,hashlib,subprocess,sys
out=Path(sys.argv[1]);source=Path('research/items/R296.generate-seek-fragments-without-replaying-a-mux-session/evidence/20260919T212400Z-dependent-gop/source.mp4');b=source.read_bytes();packets=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-of','json',str(source)]))['packets'];samples=[]
for i,p in enumerate(packets):
 start=int(p['pos']);end=start+int(p['size']);pos=start;nals=[]
 while pos<end:
  n=int.from_bytes(b[pos:pos+4],'big');assert n>0 and pos+4+n<=end;header=b[pos+4];nals.append({'type':header&31,'ref_idc':(header>>5)&3,'start':pos,'end':pos+4+n});pos+=4+n
 assert pos==end;vcl=[n for n in nals if n['type'] in [1,5]];assert vcl
 samples.append({'ordinal':i,'start':start,'end':end,'pts':p['pts'],'key':p['flags'].startswith('K'),'referenceCritical':any(n['ref_idc']!=0 for n in vcl),'nals':nals})
rows=[]
for unit in [16384,4096,1024]:
 parts=[]
 for start in range(0,len(b),unit):
  end=min(start+unit,len(b));hit=[p for p in samples if p['start']<end and p['end']>start];critical=[p['ordinal'] for p in hit if p['referenceCritical']];disposable=[p['ordinal'] for p in hit if not p['referenceCritical']];covered=sum(max(0,min(end,p['end'])-max(start,p['start'])) for p in hit);metadata=end-start-covered;parts.append({'start':start,'end':end,'referencePackets':critical,'nonReferencePackets':disposable,'metadataBytes':metadata,'critical':bool(critical or metadata)})
 rows.append({'unitBytes':unit,'units':parts,'criticalUnits':sum(x['critical'] for x in parts),'totalUnits':len(parts),'nonReferenceOnlyUnits':sum(not x['critical'] for x in parts)})
assert any(p['referenceCritical'] for p in samples) and any(not p['referenceCritical'] for p in samples)
# Independent encoded flag sanity: every IDR sample is critical; non-reference VCL cannot be IDR.
assert all(p['referenceCritical'] for p in samples if p['key']);assert all(n['type']!=5 for p in samples if not p['referenceCritical'] for n in p['nals'])
result={'source':str(source),'sourceSHA256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'samples':samples,'rows':rows,'controls':{'referenceAndNonReferenceBothPresent':True,'allIDRCritical':True,'noNonReferenceIDR':True},'scope':'Conservative AVC reference-critical classification from actual length-prefixed VCL nal_ref_idc, with container/config metadata critical. Established authenticated provider admits16KiB units. This does not prove every reference picture contributes to every later picture, and does not evaluate finer packet-level FEC.','opportunityAt16KiB':rows[0]['nonReferenceOnlyUnits']>0};(out/'result.json').write_text(json.dumps(result,indent=2));print([{k:v for k,v in r.items() if k!='units'} for r in rows])
