"""D40. Select complete independent Opus components; restricted single-frame packets."""
from common import *
from ogg import read,write,op

def split_components(p,streams,coupled):
 if not 1<=streams<=8 or not 0<=coupled<=streams:raise ValueError('stream bound')
 pos=0;out=[]
 for i in range(streams):
  if pos>=len(p):raise ValueError('truncated TOC')
  toc=p[pos];pos+=1
  if toc&3:raise ValueError('only Opus code-0 packets in this component')
  if bool(toc&4)!=(i<coupled):raise ValueError('coupled component stereo flag')
  if i<streams-1:
   if pos>=len(p):raise ValueError('missing self-delimited size')
   n=p[pos];pos+=1
   if n>=252:
    if pos>=len(p):raise ValueError('short two-byte size')
    n+=4*p[pos];pos+=1
  else:n=len(p)-pos
  if n<=0 or n>1275 or pos+n>len(p):raise ValueError('component length bound')
  q=bytes([toc])+p[pos:pos+n];pos+=n
  if op.opus_packet_get_nb_samples(q,len(q),48000)!=960:raise ValueError('20ms component scope')
  out.append(q)
 if pos!=len(p):raise ValueError('trailing bytes')
 return out

def select(head,packets,requested,expected_preskip):
 # Fixed six-channel mapping family 1: Vorbis order FL,FC,FR,RL,RR,LFE.
 if len(head)!=27 or head[:10]!=b'OpusHead\x01\x06' or head[18:]!=bytes([1,4,2,0,4,1,2,3,5]):raise ValueError('unqualified layout')
 if int.from_bytes(head[10:12],'little')!=expected_preskip:raise ValueError('pre-skip/source contract mismatch')
 if requested=='front_pair':component,channels=0,2
 elif requested=='center':component,channels=2,1
 elif requested=='rear_pair':component,channels=1,2
 else:raise ValueError('only complete independent mono/coupled pair; not downmix/half-pair')
 groups=[split_components(p,4,2) for p in packets];out=[x[component] for x in groups]
 h=bytearray(head[:19]);h[9]=channels;h[18]=0
 return bytes(h),out

if __name__=='__main__':
 N=102576;t=np.arange(N)/48000;freqs=[311,533,719,83,997,1291]
 a=np.column_stack([.18*np.sin(2*np.pi*(f*t+(j+1)*3*t*t))+.025*np.sin(2*np.pi*(f*1.37)*t) for j,f in enumerate(freqs)]).astype('<f4')
 (F/'six.f32').write_bytes(a.tobytes());(F/'six_reference.wav').write_bytes(wav_float(a,48000))
 ff('-f','f32le','-ar','48000','-ac','6','-channel_layout','5.1','-i',F/'six.f32','-c:a','libopus','-mapping_family','1','-frame_duration','20','-b:a','384k',F/'six.opus')
 ps,end=read((F/'six.opus').read_bytes());h,tags=ps[:2];packets=ps[2:];print('head',h.hex(),'packets',len(packets),'first',packets[0][:12].hex(),flush=True)
 original=ff('-c:a','libopus','-i',F/'six.opus','-f','f32le','-');orig=np.frombuffer(original,dtype='<f4').reshape(-1,6);(F/'six_host.f32').write_bytes(original)
 o={'source_bytes':(F/'six.opus').stat().st_size,'source_packets':len(packets),'source_head_hex':h.hex(),'frames':len(orig),'pre_skip':int.from_bytes(h[10:12],'little'),'final_granule':end,'variants':{}}
 for name,chans in [('front_pair',[0,1]),('center',[2]),('rear_pair',[4,5])]:
  hh,pp=select(h,packets,name,o['pre_skip']);out=write(hh,tags,pp,end);(F/(name+'.opus')).write_bytes(out);ff('-i',F/(name+'.opus'),'-c:a','copy',F/(name+'.webm'))
  decoded=ff('-c:a','libopus','-i',F/(name+'.opus'),'-f','f32le','-');d=np.frombuffer(decoded,dtype='<f4').reshape(-1,len(chans))
  (F/(name+'_host_reference.f32')).write_bytes(orig[:,chans].astype('<f4').tobytes())
  o['variants'][name]={'channels':chans,'bytes':len(out),'webm_bytes':(F/(name+'.webm')).stat().st_size,'coded_component_packets':len(pp),'coded_component_bytes':sum(map(len,pp)),'component_packet_hash':sha(b''.join(pp)),'host':cmp(d,orig[:,chans]),'component_payload_exact':all(q==split_components(p,4,2)[{'front_pair':0,'center':2,'rear_pair':1}[name]]for p,q in zip(packets,pp))}
 o['controls']={'half_pair':reject(lambda:select(h,packets,'front_left_only',o['pre_skip'])),'downmix':reject(lambda:select(h,packets,'downmix',o['pre_skip'])),'preskip':reject(lambda:select(h,packets,'front_pair',o['pre_skip']+1)),'truncated':reject(lambda:split_components(packets[0][:4],4,2)),'unsupported_code':reject(lambda:split_components(bytes([packets[0][0]|3])+packets[0][1:],4,2))}
 save('multistream_component.json',o);print(json.dumps(o,indent=2))
