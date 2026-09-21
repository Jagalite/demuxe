"""Restricted baseline-JPEG table reconstruction, no entropy decoding.
Source-bound descriptors are assumed to come from a trusted parsed source. They are
NOT inferred/authenticated by the abbreviated packet itself. SPDX-License-Identifier: MIT.
"""
from common import sha
TABLE={0xdb,0xc4}
def split(data):
 if not data.startswith(b'\xff\xd8'):raise ValueError('not JPEG')
 p=2;segs=[]
 while p<len(data):
  if p+4>len(data) or data[p]!=255:raise ValueError('invalid marker boundary')
  m=data[p+1];n=int.from_bytes(data[p+2:p+4],'big')
  if n<2 or p+2+n>len(data):raise ValueError('truncated marker')
  segs.append((m,data[p:p+2+n]));p+=2+n
  if m==0xda:
   if not data.endswith(b'\xff\xd9'):raise ValueError('missing EOI')
   return segs,data[p:]
  if m in (0xd8,0xd9) or m==0xc2:raise ValueError('baseline sequential profile only')
 raise ValueError('no scan')
def abbreviate(data,epoch):
 seg,scan=split(data);tables=[b for m,b in seg if m in TABLE]
 if not tables:raise ValueError('no source tables')
 small=b'\xff\xd8'+b''.join(b for m,b in seg if m not in TABLE)+scan
 descriptor={'epoch':epoch,'table_sha256':sha(b''.join(tables)),'source_scan_sha256':sha(scan)}
 return small,tables,descriptor

def restore(data,tables,descriptor,current_epoch):
 if descriptor['epoch']!=current_epoch:raise ValueError('wrong configuration epoch')
 if not tables or sha(b''.join(tables))!=descriptor['table_sha256']:raise ValueError('missing or mismatched source tables')
 seg,scan=split(data)
 if any(m in TABLE for m,_ in seg):raise ValueError('already has tables; pass through separately')
 # A bounded source contract pins scan identity; not an authenticity guarantee.
 if sha(scan)!=descriptor['source_scan_sha256']:raise ValueError('wrong scan source')
 return b'\xff\xd8'+b''.join(tables)+b''.join(b for _,b in seg)+scan
