# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,ctypes,struct,time,statistics,hashlib
p=pathlib.Path(sys.argv[1]);p.mkdir(parents=True,exist_ok=True);source=pathlib.Path('results/catalogue-current/opus/original.ogg');data=source.read_bytes();packets=[];at=0;pending=b''
while at<len(data):
 assert data[at:at+4]==b'OggS';n=data[at+26];laces=data[at+27:at+27+n];pos=at+27+n;endgranule=struct.unpack_from('<Q',data,at+6)[0]
 for size in laces:
  pending+=data[pos:pos+size];pos+=size
  if size<255:packets.append(pending);pending=b''
 at=pos
head,tags,*coded=packets;channels=head[9];preskip=struct.unpack_from('<H',head,10)[0];assert channels in[1,2];libpath=pathlib.Path('/opt/homebrew/opt/opus/lib/libopus.dylib').resolve();lib=ctypes.CDLL(str(libpath));lib.opus_decoder_get_size.argtypes=[ctypes.c_int];lib.opus_decoder_get_size.restype=ctypes.c_int;lib.opus_decoder_init.argtypes=[ctypes.c_void_p,ctypes.c_int,ctypes.c_int];lib.opus_decoder_init.restype=ctypes.c_int;lib.opus_decode_float.argtypes=[ctypes.c_void_p,ctypes.c_char_p,ctypes.c_int,ctypes.POINTER(ctypes.c_float),ctypes.c_int,ctypes.c_int];lib.opus_decode_float.restype=ctypes.c_int;size=lib.opus_decoder_get_size(channels);identity=(hashlib.sha256(data).hexdigest(),hashlib.sha256(libpath.read_bytes()).hexdigest(),48000,channels);samplebytes=4*channels
class Decoder:
 def __init__(self):self.memory=ctypes.create_string_buffer(size);self.output=(ctypes.c_float*(5760*channels))();self.epoch=1;self.closed=False;self.reset()
 def reset(self):assert lib.opus_decoder_init(self.memory,48000,channels)==0
 def decode(self,packet):
  if self.closed:raise ValueError('closed')
  n=lib.opus_decode_float(self.memory,packet,len(packet)if packet is not None else 0,self.output,960,0)
  if n!=960:raise ValueError('duration')
  return ctypes.string_at(self.output,n*samplebytes)
 def snapshot(self,begin):return {'bytes':self.memory.raw,'identity':identity,'epoch':self.epoch,'begin':begin}
 def restore(self,snapshot,consumed):
  if self.closed or snapshot['identity']!=identity or snapshot['epoch']!=self.epoch or consumed>snapshot['begin']:raise ValueError('not rollbackable')
  ctypes.memmove(self.memory,snapshot['bytes'],size)
 def close(self):self.closed=True;self.epoch+=1
reference=Decoder();full=b''.join(reference.decode(x)for x in coded);reference.close();canonical=full[preskip*samplebytes:endgranule*samplebytes];protocol={'item':'R161.roll-back-speculative-audio-when-a-late-packet-arrives','scope':'Pinnedhostlibopus opaque contiguousdecoderstate memcpy permitted by installedopus.h; 48k complete20mspackets; provisionalPCM not yetirreversibly consumed. SnapshotbeforePLC, decode4subsequentpackets, restorelateoriginal, replaceentireprovisionalwindow, continuecomplete suffix including preskip/endtrim.','correctness':'Everyfloatbyte equalscontinuousno-loss decoder for4latepositions; no-restorecontrol differs, actualconsumeradvance prohibitsrollback withoutchangingstate, source/runtime/epoch/closedguardreject.','performance':'Aftercorrectness1warmup5alternating completepacket40lateevent jobs, candidate snapshot/PLC/restore/window-redecode versus replayfromfreshdecoderprefix onarrival; allsamePCM. Candidate<=0.9baseline. Reportstate+pendingPCM payload, not totalprocessmemory. No-networkwait shared/omitted.'};(p/'protocol.json').write_text(json.dumps(protocol,indent=2))
def repair(candidate,missing=40,lookahead=4,wrong_restore=False):
 d=Decoder();output=[d.decode(x)for x in coded[:missing]];begin=missing*960;s=d.snapshot(begin)if candidate else None;provisional=[d.decode(None)]+[d.decode(x)for x in coded[missing+1:missing+lookahead+1]]
 if candidate:
  if not wrong_restore:d.restore(s,begin)
 else:
  d.reset()
  for x in coded[:missing]:d.decode(x)
 corrected=[d.decode(x)for x in coded[missing:missing+lookahead+1]];assert b''.join(provisional)!=b''.join(corrected);output+=corrected;output += [d.decode(x)for x in coded[missing+lookahead+1:]];d.close();return b''.join(output)[preskip*samplebytes:endgranule*samplebytes]
rows=[]
for missing in [2,20,60,95]:
 assert missing+4<len(coded);actual=repair(True,missing);assert actual==canonical;rows.append({'latePacket':missing,'pendingPackets':5,'completePCMExact':True,'samples':len(actual)//samplebytes})
assert repair(True,20,wrong_restore=True)!=canonical;d=Decoder()
for x in coded[:20]:d.decode(x)
snapshot=d.snapshot(20*960);pending_pcm=d.decode(None);consumed=20*960
# A real one-sample consumer read advances irreversible publication.
consumed_sample=pending_pcm[:samplebytes];consumed+=1;before=d.memory.raw;controls={'withoutRestoreMismatch':True}
for name,change,position in [('afterConsumed',snapshot,consumed),('wrongSource',{**snapshot,'identity':('wrong',*identity[1:])},snapshot['begin']),('wrongEpoch',{**snapshot,'epoch':0},snapshot['begin'])]:
 try:d.restore(change,position);raise RuntimeError('accepted')
 except ValueError:controls[name+'Rejected']=True;assert d.memory.raw==before
d.close()
try:d.restore(snapshot,snapshot['begin']);raise RuntimeError('closed accepted')
except ValueError:controls['closedRejected']=True
cost=[]
for i in range(6):
 for candidate in ([True,False]if i%2==0 else[False,True]):
  t=time.perf_counter();actual=repair(candidate);ms=(time.perf_counter()-t)*1000;assert actual==canonical
  if i:cost.append({'pair':i,'candidate':candidate,'ms':ms})
c=statistics.median(x['ms']for x in cost if x['candidate']);b=statistics.median(x['ms']for x in cost if not x['candidate']);r={'correctness':rows,'controls':controls,'candidateStateSnapshotBytes':size,'pendingPCMBytes':5*960*samplebytes,'consumerReadBytes':len(consumed_sample),'codedPackets':len(coded),'channels':channels,'preskip':preskip,'endgranule':endgranule,'outputSHA256':hashlib.sha256(canonical).hexdigest(),'rows':cost,'candidateMedianMs':c,'baselineMedianMs':b,'ratio':c/b,'performancePassed':c/b<=.9,'runtimeIdentity':identity};(p/'results.json').write_text(json.dumps(r,indent=2));(p/'reference.f32').write_bytes(canonical);(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/opus_late_rollback.py '+str(p)+'\n');print({k:v for k,v in r.items()if k not in ['rows','runtimeIdentity']})
