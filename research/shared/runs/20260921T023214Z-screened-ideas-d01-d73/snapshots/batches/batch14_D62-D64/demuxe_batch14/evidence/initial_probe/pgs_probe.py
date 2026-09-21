from pathlib import Path
import struct,subprocess
R=Path(__file__).resolve().parents[1];F=R/'fixtures'
def be(n,k):return int(n).to_bytes(k,'big')
def seg(t,k,b):return b'PG'+be(round(t*90000),4)+be(0,4)+bytes([k])+be(len(b),2)+b
def pcs(t,n,refs,state=0,pal=0):
 b=be(128,2)+be(64,2)+bytes([0x10])+be(n,2)+bytes([state,pal,0,len(refs)])
 for oid,x,y in refs:b+=be(oid,2)+bytes([0,0])+be(x,2)+be(y,2)
 return seg(t,0x16,b)
def pds(t,ver=0):
 p=[(0,16,128,128,0),(1,235,128,128,255),(2,235,128,128,128),(3,16,128,128,255)]
 if ver:p=[(0,16,128,128,0),(1,16,128,128,255),(2,235,128,128,255),(3,235,128,128,128)]
 return seg(t,0x14,bytes([0,ver])+b''.join(bytes(x) for x in p))
def ods(t,oid=0):
 w,h=40,16;rle=b''
 for y in range(h):
  rle+=bytes([0,0x80|10,1,0,0x80|10,2,0,0x80|10,3,0,10,0,0])
 b=be(oid,2)+bytes([0,0xc0])+be(len(rle)+4,3)+be(w,2)+be(h,2)+rle
 return seg(t,0x15,b)
wds=lambda t:seg(t,0x17,b'\x01\x00'+be(0,2)+be(0,2)+be(128,2)+be(64,2))
b=pcs(.25,0,[(0,10,10)],0x80)+wds(.25)+pds(.25)+ods(.25)+seg(.25,0x80,b'')
b+=pcs(.75,1,[(0,10,10)],0,0x80)+pds(.75,1)+seg(.75,0x80,b'')
b+=pcs(1.25,2,[])+seg(1.25,0x80,b'')
(F/'probe.sup').write_bytes(b)
