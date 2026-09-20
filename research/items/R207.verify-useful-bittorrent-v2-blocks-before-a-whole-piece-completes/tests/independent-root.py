# SPDX-License-Identifier: Apache-2.0
import hashlib,json,pathlib,sys
r=pathlib.Path(sys.argv[1]);j=json.loads((r/'merkle.json').read_text());b=pathlib.Path(j['source']).read_bytes();H=lambda x:hashlib.sha256(x).digest()
def subtree(first,count):
 if count==1:return H(b[first*16384:(first+1)*16384]) if first*16384<len(b) else bytes(32)
 return H(subtree(first,count//2)+subtree(first+count//2,count//2))
width=1<<((len(b)+16383)//16384-1).bit_length();root=subtree(0,width).hex();assert root==j['root'];(r/'independent-root.json').write_text(json.dumps({'algorithm':'Independent Python recursive tree; short last block hashes actual bytes; absent leaf is32zero bytes.','root':root,'matches':True},indent=2))
