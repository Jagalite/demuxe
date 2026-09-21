"""D42. Split complete Ogg links at real BOS/EOS boundaries, retain each trim/gain/configuration."""
from common import *
from ogg import read,write,pages,crc,op

def split_links(b):
 if len(b)>4000000:raise ValueError('chain input cap')
 links=[];active=None;start=0;seen=set()
 for p in pages(b):
  if active is None:
   if p['flags']!=2 or p['seq']!=0 or p['serial'] in seen:raise ValueError('new unique BOS required')
   active=p['serial'];start=p['start'];seen.add(active)
  elif p['flags']&2 or p['serial']!=active:raise ValueError('multiplexing or missing previous EOS')
  if p['flags']&4:
   raw=b[start:p['end']];ps,g=read(raw);h=ps[0]
   if h[:10]!=b'OpusHead\x01\x02' or len(h)!=19 or h[18]!=0:raise ValueError('stereo family0 only')
   pre=int.from_bytes(h[10:12],'little');frames=g-pre
   if not 0<frames<=500000:raise ValueError('bounded positive link duration')
   links.append({'start':start,'end':p['end'],'serial':active,'pre_skip':pre,'gain_q8':int.from_bytes(h[16:18],'little',signed=True),'frames':frames,'sha256':sha(raw),'head_hex':h.hex(),'packets':len(ps)-2,'packet_hash':sha(b''.join(ps[2:]))});active=None
 if active is not None or not links or len(links)>16:raise ValueError('incomplete/big chain')
 return links

if __name__=='__main__':
 sizes=[50003,37001,68009];gains=[0,3*256,-6*256];links=[];ref=[]
 for j,(n,gain) in enumerate(zip(sizes,gains)):
  t=np.arange(n)/48000;a=np.column_stack([.18*np.sin(2*np.pi*((311+300*j)*t+5*t*t)),.12*np.sin(2*np.pi*((799+211*j)*t-3*t*t))]).astype('<f4')
  raw=F/f'link{j}.f32';raw.write_bytes(a.tobytes())
  ff('-f','f32le','-ar','48000','-ac','2','-i',raw,'-c:a','libopus','-application','lowdelay' if j==1 else 'audio','-frame_duration','20','-b:a','128k',F/f'link{j}_encoder.opus')
  ps,end=read((F/f'link{j}_encoder.opus').read_bytes());head=bytearray(ps[0]);head[16:18]=gain.to_bytes(2,'little',signed=True)
  encoded=write(bytes(head),ps[1],ps[2:],end,serial=810+j);(F/f'link{j}.opus').write_bytes(encoded);links.append(encoded)
  rr=ff('-c:a','libopus','-i',F/f'link{j}.opus','-f','f32le','-');ref.append(rr)
 b=b''.join(links);(F/'chained.opus').write_bytes(b);index=split_links(b)
 for j,q in enumerate(index):(F/f'split{j}.opus').write_bytes(b[q['start']:q['end']])
 expected=b''.join(ref);actual=ff('-c:a','libopus','-i',F/'chained.opus','-f','f32le','-',check=False)
 (F/'chain_host_reference.f32').write_bytes(expected);(F/'chain_host_whole.f32').write_bytes(actual)
 psall=[read(x)for x in links];flat=[p for ps,e in psall for p in ps[2:]]
 total=sum(op.opus_packet_get_nb_samples(p,len(p),48000)for p in flat)
 (F/'wrong_flatten.opus').write_bytes(write(psall[0][0][0],psall[0][0][1],flat,total,serial=890))
 wrong=ff('-c:a','libopus','-i',F/'wrong_flatten.opus','-f','f32le','-')
 # Real missing-EOS control, with a repaired page CRC to isolate the structural violation.
 pp=list(pages(links[0]));last=bytearray(pp[-1]['raw']);last[5]&=~4;last[22:26]=b'\0'*4;last[22:26]=crc(last).to_bytes(4,'little');missing=links[0][:pp[-1]['start']]+last+b''.join(links[1:])
 o={'source_bytes':len(b),'links':index,'expected_frames':sum(sizes),'split_bytes_exact':all(b[q['start']:q['end']]==links[j]for j,q in enumerate(index)),'source_duration_seconds':sum(sizes)/48000,'host_whole':cmp(np.frombuffer(actual,dtype='<f4').reshape(-1,2),np.frombuffer(expected,dtype='<f4').reshape(-1,2)),'wrong_flatten':cmp(np.frombuffer(wrong,dtype='<f4').reshape(-1,2),np.frombuffer(expected,dtype='<f4').reshape(-1,2)),'controls':{'missing_eos':reject(lambda:split_links(missing)),'truncated':reject(lambda:split_links(b[:-3])),'reused_serial':reject(lambda:split_links(links[0]+links[0]))}}
 save('chain_component.json',o);save('chain_manifest.json',{'links':index,'frames':sum(sizes)});print(json.dumps(o,indent=2))
