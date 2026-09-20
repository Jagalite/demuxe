# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,hashlib,array,subprocess
from aac_sce_parser import *
BASE=pathlib.Path('research/shared/runs/20260919T230128Z-aac-elements');SOURCE=BASE/'mono0.aac';REPLACEMENT=BASE/'mono4.aac';EDITS=[10,20,30]
def strict(payload):
 b=Bits.frombytes(payload);result=None
 while True:
  kind=b.get(3)
  if kind==7:break
  if kind==0:
   if result is not None:raise ValueError('multiple SCE')
   _,result=sce(b)
  elif kind==6:
   count=b.get(4)
   if count==15:count+=b.get(8)-1
   at=b.at
   if count and b.get(4)not in[0,1]:raise ValueError('persistent or unknown extension')
   b.at=at+count*8
   if b.at>len(b.bits):raise ValueError('fill bounds')
  else:raise ValueError('unsupported element')
 if result is None:raise ValueError('no SCE')
 return result

def prepare(raw,replacement,identity,replacementIdentity):
 if hashlib.sha256(raw).hexdigest()!=identity or hashlib.sha256(replacement).hexdigest()!=replacementIdentity:raise ValueError('identity')
 packets=adts_packets(raw);other=adts_packets(replacement)
 if len(packets)!=len(other):raise ValueError('alignment')
 return packets,other,[strict(x)for x in packets],[strict(x)for x in other]
def edit(prepared,index):
 packets,other,coded,otherCoded=prepared
 if index<1 or index+2>=len(packets):raise ValueError('guard interval')
 shape=coded[index][15]
 if any(int(coded[i][13:15],2)!=0 or coded[i][15]!=shape for i in range(index-1,index+3))or int(otherCoded[index][13:15],2)!=0 or otherCoded[index][15]!=shape:raise ValueError('long-window state profile')
 candidate=list(packets);candidate[index]=other[index];return b''.join(adts(x,1)for x in candidate),{'editedPacket':index,'safeSuffixPacket':index+2,'safeSuffixSample':(index+2)*1024,'reason':'Independent long-windowAAC-LC singlechannel, no prediction/PNS/TNS/SBR/coupling/dynamic-range state; unchanged nextframe reconstructs original saved overlap, subsequent frame has same window state and coded input.'}
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
def main():
 p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);raw=SOURCE.read_bytes();other=REPLACEMENT.read_bytes();identity=hashlib.sha256(raw).hexdigest();otherid=hashlib.sha256(other).hexdigest();prepared=prepare(raw,other,identity,otherid)
 (p/'protocol.json').write_text(json.dumps({'scope':'Explicit coded AAC-LC mono packet substitution at10/20/30,48k. Strict independent SCE parser rejects prediction/noise/intensity/TNS/pulse/gain/SBR/coupling/unknown or dynamic-range fill; identical long-window sequence and shape around edit. Under this controlled overlap-only recipe, safe suffix begins packetedit+2. All subsequent original packets copied.','correctness':'Actual full FFmpeg and native decode prove every copied suffix sample exact, all preceding prefix samples unchanged, edited region different; claimingedit+1 too soon must fail. Source/runtime tools/window state changes invalidate certificate. No certificate for unknown AAC profile.','performance':'After correctness five alternating cold source/replacement read/hash/table load/strict parser/three coded edits+certificates versus same threecoded edits+full source and each edited PCM decode/suffix validation. Same concrete edited assets and sample-specific valid certificates; candidate<=0.9cost. No production integration or generic AAC splice claim.'},indent=2));reference=decode(SOURCE);rows=[]
 for index in EDITS:
  output,cert=edit(prepared,index);dest=p/f'edit{index}.aac';dest.write_bytes(output);actual=decode(dest);cut=cert['safeSuffixSample']*4;early=(index+1)*1024*4;prefix=index*1024*4;assert len(actual)==len(reference)and actual[cut:]==reference[cut:]and actual[:prefix]==reference[:prefix]and actual[prefix:cut]!=reference[prefix:cut];assert actual[early:]!=reference[early:];rows.append({**cert,'samples':len(actual)//4,'hostSuffixExact':True,'prefixExact':True,'editedRegionDiffers':True,'onePacketEarlyFails':True})
 controls={}
 try:prepare(raw,other,'wrong',otherid);controls['identity']=False
 except ValueError:controls['identity']=True
 try:edit(prepared,0);controls['boundary']=False
 except ValueError:controls['boundary']=True
 modified=list(prepared);modified[2]=list(prepared[2]);s=modified[2][10];modified[2][10]=s[:13]+'10'+s[15:]
 try:edit(modified,10);controls['windowState']=False
 except ValueError:controls['windowState']=True
 # Real element prefix locating a disallowed DRC extension, rejected before using codec state.
 fill=Bits();fill.put(6,3);fill.put(1,4);fill.put(11,4);fill.put(0,4);fill.put(7,3)
 try:strict(fill.bytes());controls['dynamicRange']=False
 except ValueError:controls['dynamicRange']=True
 assert all(controls.values());(p/'results.json').write_text(json.dumps({'rows':rows,'controls':controls,'sourceSHA256':identity,'replacementSHA256':otherid,'decoderProfile':'controlled AAC-LC overlap only, consumer-specific validation recorded'},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/aac_edit_closure.py '+str(p)+'\n');print(rows)
if __name__=='__main__':main()
