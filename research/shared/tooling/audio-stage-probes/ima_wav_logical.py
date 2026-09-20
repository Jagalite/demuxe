# SPDX-License-Identifier: Apache-2.0
import struct
STEP=[7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767]
ADJUST=[-1,-1,-1,-1,2,4,6,8]*2
# IMA normative step/index tables; original parser and state representation.
def parse(data):
 if data[:4]!=b'RIFF'or data[8:12]!=b'WAVE':raise ValueError('WAV')
 at=12;chunks={}
 while at+8<=len(data):
  kind=data[at:at+4];n=int.from_bytes(data[at+4:at+8],'little');body=data[at+8:at+8+n]
  if len(body)!=n:raise ValueError('chunk bounds')
  chunks[kind]=body;at+=8+n+(n&1)
 fmt=chunks[b'fmt '];tag,ch,rate,avg,align,bits=struct.unpack_from('<HHIIHH',fmt)
 if tag!=17 or ch not in[1,2]or bits!=4 or rate!=8000:raise ValueError('IMA WAV profile')
 spb=struct.unpack_from('<H',fmt,18)[0];body=chunks[b'data'];blocks=[]
 if len(body)%align:raise ValueError('block size')
 for at in range(0,len(body),align):
  block=body[at:at+align];headers=[];codes=[[]for _ in range(ch)]
  for c in range(ch):
   pred,index,reserved=struct.unpack_from('<hBB',block,c*4)
   if index>88 or reserved:raise ValueError('state header')
   headers.append((pred,index))
  coded=block[4*ch:]
  if ch==1:
   for byte in coded:codes[0].extend([byte&15,byte>>4])
  else:
   if len(coded)%8:raise ValueError('stereo group')
   for pos in range(0,len(coded),8):
    for c in range(2):
     for byte in coded[pos+c*4:pos+c*4+4]:codes[c].extend([byte&15,byte>>4])
  if any(len(x)!=spb-1 for x in codes):raise ValueError('samples per block')
  blocks.append({'headers':headers,'codes':codes})
 return {'channels':ch,'rate':rate,'samplesPerBlock':spb,'blocks':blocks}
def advance(pred,index,code):
 step=STEP[index];mag=code&7;delta=(step>>3)+(step if mag&4 else 0)+(step>>1 if mag&2 else 0)+(step>>2 if mag&1 else 0)
 if code&8:delta=-delta
 return max(-32768,min(32767,pred+delta)),max(0,min(88,index+ADJUST[code]))
def decode(parsed):
 out=[]
 for block in parsed['blocks']:
  states=list(block['headers']);out.append([x[0]for x in states])
  for i in range(parsed['samplesPerBlock']-1):
   states=[advance(pred,idx,block['codes'][c][i])for c,(pred,idx)in enumerate(states)];out.append([x[0]for x in states])
 return out
