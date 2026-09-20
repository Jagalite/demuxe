# SPDX-License-Identifier: Apache-2.0
import pathlib,json,hashlib,sys
p=pathlib.Path(sys.argv[1]);r=json.loads((p/'results.json').read_text());f=r['certificate']['fields'];assert all(v==0 for v in f['gaps_in_frame_num_allowed_flag']);assert f['frame_num']==list(range(16))+list(range(14))+list(range(16))+list(range(14));types=[v for v in f['nal_unit_type'] if v in [1,5]];assert types==[5]+[1]*29+[5]+[1]*29
# Hash must be checked against the currently selected immutable source before committing certified header output.
def admit(source,generation):
 assert generation==1
 assert hashlib.sha256(source).hexdigest()==r['sourceSHA']
 assert r['certificate']['accepted']
 return (p/'candidate.h264').read_bytes()
source=(p/'overstated.h264').read_bytes();assert admit(source,1)==(p/'candidate.h264').read_bytes()
rejects=[]
for k,b,g in [('changed-source',source[:-1]+bytes([source[-1]^1]),1),('extra-reference',(p/'extra.h264').read_bytes(),1),('stale-generation',source,2)]:
 try:admit(b,g);raise RuntimeError('accepted')
 except AssertionError:rejects.append(k)
(p/'admission.json').write_text(json.dumps({'frameNumWrapAndIDRBoundariesValidated':True,'gapsDisallowed':True,'rejects':rejects,'scope':'Whole source hash-bound conservative I/P profile; exact indexed syntactic observer values, no arbitrary adaptive reference liveness.'},indent=2))
