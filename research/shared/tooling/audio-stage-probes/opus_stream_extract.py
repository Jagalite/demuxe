# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,struct,hashlib,ctypes,array,time,statistics
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);commands=[]
def call(a):commands.append(a);return subprocess.check_output(a,stderr=subprocess.DEVNULL)
source=p/'source.ogg';call(['ffmpeg','-v','error','-y','-f','lavfi','-i','aevalsrc=0.1*sin(2*PI*220*t)|0.1*sin(2*PI*440*t)|0.1*sin(2*PI*660*t)|0.1*sin(2*PI*80*t)|0.1*sin(2*PI*880*t)|0.1*sin(2*PI*1100*t):s=48000:d=2:c=5.1','-c:a','libopus','-application','lowdelay','-frame_duration','20','-b:a','384k',str(source)])
def unpack(data):
 pos=0;packets=[];pending=b''
 while pos<len(data):
  if data[pos:pos+4]!=b'OggS':raise ValueError('page')
  count=data[pos+26];laces=data[pos+27:pos+27+count];at=pos+27+count;gp=struct.unpack_from('<Q',data,pos+6)[0]
  for size in laces:
   pending+=data[at:at+size];at+=size
   if size<255:packets.append(pending);pending=b''
  pagebytes=bytearray(data[pos:at])
  if at>len(data) or len(pagebytes)<27:raise ValueError('page bounds')
  expectedCRC=struct.unpack_from('<I',pagebytes,22)[0];pagebytes[22:26]=b'\0'*4;actualCRC=0
  for x in pagebytes:actualCRC=((actualCRC<<8)^T[((actualCRC>>24)^x)&255])&0xffffffff
  if actualCRC!=expectedCRC:raise ValueError('page CRC')
  pos=at
 if pending:raise ValueError('packet')
 return packets,gp
def components(packet,streams,coupled):
 at=0;parts=[]
 for i in range(streams):
  toc=packet[at];at+=1
  if toc&3 or (toc>>3)<16 or ((toc>>3)&3)!=3:raise ValueError('one CELT20ms frame only')
  if bool(toc&4)!=(i<coupled):raise ValueError('coupling')
  if i<streams-1:
   first=packet[at];at+=1
   if first<252:size=first
   else:size=first+4*packet[at];at+=1
   if at+size>len(packet):raise ValueError('self delim size')
  else:size=len(packet)-at
  parts.append(bytes([toc])+packet[at:at+size]);at+=size
 if at!=len(packet):raise ValueError('trailing')
 return parts
def selfdelim(packet):
 n=len(packet)-1
 if n<252:size=bytes([n])
 else:
  first=252+(n&3);size=bytes([first,(n-first)//4])
 return packet[:1]+size+packet[1:]
T=[]
for i in range(256):
 c=i<<24
 for _ in range(8):c=((c<<1)^0x04c11db7 if c&0x80000000 else c<<1)&0xffffffff
 T.append(c)
def page(packet,seq,gp,flag):
 laces=[255]*(len(packet)//255)+[len(packet)%255];b=bytearray(b'OggS'+bytes([0,flag])+struct.pack('<QII',gp,0xB0131234,seq)+b'\0'*4+bytes([len(laces)])+bytes(laces)+packet);crc=0
 for x in b:crc=((crc<<8)^T[((crc>>24)^x)&255])&0xffffffff
 struct.pack_into('<I',b,22,crc);return bytes(b)
def extract(data,mode,claimed_preskip=None,requested_channels=None):
 packets,gp=unpack(data);head,tags,*coded=packets
 if head[:8]!=b'OpusHead' or head[9]!=6 or head[18]!=1 or head[19:21]!=bytes([4,2]) or head[21:]!=bytes([0,4,1,2,3,5]):raise ValueError('mapping profile')
 pre=struct.unpack_from('<H',head,10)[0]
 if (requested_channels is not None and requested_channels!={'mono':[2],'stereo':[0,1],'three':[0,1,2]}.get(mode)) or (claimed_preskip is not None and pre!=claimed_preskip):raise ValueError('partial pair or origin mismatch')
 if mode=='mono':indices=[2];newhead=bytearray(head[:19]);newhead[9]=1;newhead[18]=0
 elif mode=='stereo':indices=[0];newhead=bytearray(head[:19]);newhead[9]=2;newhead[18]=0
 elif mode=='three':indices=[0,2];newhead=bytearray(head[:19]);newhead[9]=3;newhead[18]=1;newhead+=bytes([2,1,0,2,1])
 else:raise ValueError('intent')
 output=[];hashes=[]
 for packet in coded:
  parts=components(packet,4,2);selected=[parts[i]for i in indices];hashes.append([hashlib.sha256(x).hexdigest()for x in selected]);output.append(b''.join(selfdelim(x)for x in selected[:-1])+selected[-1])
 result=[page(newhead,0,0,2),page(tags,1,0,0)]+[page(x,i+2,min((i+1)*960,gp),4 if i==len(output)-1 else 0)for i,x in enumerate(output)]
 return b''.join(result),hashes
source_bytes=source.read_bytes();packets,gp=unpack(source_bytes);head=packets[0];print({'head':list(head),'packets':len(packets)-2},flush=True)
ref=call(['ffmpeg','-v','error','-i',str(source),'-f','f32le','-']);reference=array.array('f');reference.frombytes(ref);rows=[]
for mode,channels in [('mono',[2]),('stereo',[0,1]),('three',[0,1,2])]:
 output,hashes=extract(source_bytes,mode);dest=p/(mode+'.ogg');dest.write_bytes(output);raw=call(['ffmpeg','-v','error','-i',str(dest),'-f','f32le','-']);actual=array.array('f');actual.frombytes(raw);expected=array.array('f',(reference[i*6+c]for i in range(len(reference)//6)for c in channels));error=max(abs(x-y)for x,y in zip(actual,expected));rows.append({'mode':mode,'channels':channels,'samples':len(actual)//len(channels),'hostPCMExact':raw==expected.tobytes(),'maxError':error,'bytes':len(output),'componentSHA256':hashes});assert raw==expected.tobytes()
controls={}
for name,args in [('halfPair',{'requested_channels':[0]}),('preskip',{'claimed_preskip':312999})]:
 try:extract(source_bytes,'stereo',**args);raise RuntimeError('accepted')
 except ValueError:controls[name+'Rejected']=True
for name,bad in [('truncated',source_bytes[:-1]),('CRC',source_bytes[:-5]+bytes([source_bytes[-5]^1])+source_bytes[-4:])]:
 try:extract(bad,'stereo');raise RuntimeError('accepted malformed')
 except (ValueError,IndexError):controls[name+'Rejected']=True
(p/'host-results.json').write_text(json.dumps({'rows':rows,'controls':controls,'sourceBytes':len(source_bytes),'sourceChannels':6,'preskip':struct.unpack_from('<H',head,10)[0],'endGranule':gp},indent=2));(p/'commands.log').write_text('\n'.join(map(json.dumps,commands))+'\n');(p/'protocol.json').write_text(json.dumps({'item':'R104.select-or-assemble-whole-opus-elementary-streams-without-pcm','scope':'ActualOpus6channel mappingfamily1,4streams2coupledpairs,20msoneframepackets. Parse selfdelimited component packet boundaries; extract fullcoupledpair0 ormono2, assemblepair0+mono2 asvalid3channel mapping. No halfcoupledpair or unmatchedpriming allowed.','correctness':'Codedcomponentpacketbytes unchanged, everyhost/nativebrowser sameconsumerPCM matchesselectedfullsourcechannels, preskip/gain/tail/mapping fixed, malformed/half-pair/config mismatch reject.','performance':'Aftercorrectness5alternating coldread/parse/extractorassemble/OggCRCwrite+hostdecode versusfull6chhostdecode+PCMselect; identicalfloatendpoint. Candidate<=0.9baseline, sourcebytes/selectedcodedbytes separate.'},indent=2));print([{k:v for k,v in x.items()if k!='componentSHA256'}for x in rows])
