# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json
p=pathlib.Path(sys.argv[1]);b=(p/'source.mov').read_bytes()
def box(t):
 i=b.index(t);z=int.from_bytes(b[i-4:i],'big');return b[i+4:i-4+z]
h=box(b'hvcC');l=box(b'lhvC')
def arrays(data,pos,count):
 out=[]
 for _ in range(count):
  tag=data[pos];num=int.from_bytes(data[pos+1:pos+3],'big');pos+=3;items=[]
  for __ in range(num):
   n=int.from_bytes(data[pos:pos+2],'big');pos+=2;items.append(data[pos:pos+n]);pos+=n
  out.append((tag,items))
 assert pos==len(data);return out
all=arrays(h,23,h[22])+arrays(l,6,l[5]);groups={}
for tag,items in all:groups.setdefault(tag,[]).extend(items)
a=[bytes([tag])+len(items).to_bytes(2,'big')+b''.join(len(n).to_bytes(2,'big')+n for n in items) for tag,items in groups.items()];(p/'stereo-hvcc.bin').write_bytes(h[:22]+bytes([len(a)])+b''.join(a));(p/'layered-configuration.json').write_text(json.dumps({'originalHvcCBytes':len(h),'originalLhvCBytes':len(l),'sourceArrays':[{'type':tag&63,'layerIds':[((n[0]&1)<<5)|(n[1]>>3) for n in items]} for tag,items in all],'reason':'OriginalMOV uses separate lhvC for dependent SPS/PPS. HostFFmpeg demux doesnot supply these to fullright-view decoder; combine preserved configurationNALs for independent stereo oracle without changing any coded packets.'},indent=2))
