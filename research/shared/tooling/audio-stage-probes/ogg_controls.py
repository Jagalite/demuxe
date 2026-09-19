# SPDX-License-Identifier: Apache-2.0
import pathlib,struct,subprocess,json,array,hashlib,sys
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
def crc(data):
 n=0
 for b in data:
  n^=b<<24
  for _ in range(8):n=((n<<1)^0x04c11db7 if n&0x80000000 else n<<1)&0xffffffff
 return n
def parse(data):
 pos=0;packets=[];pending=b'';pages=[];serial=None
 while pos<len(data):
  assert len(data)-pos>=27,'truncated header'
  assert data[pos:pos+5]==b'OggS\0','capture/version'
  count=data[pos+26];assert pos+27+count<=len(data),'truncated lacing';laces=data[pos+27:pos+27+count];end=pos+27+count+sum(laces);assert end<=len(data),'truncated body';page=bytearray(data[pos:end]);stored=struct.unpack_from('<I',page,22)[0];page[22:26]=b'\0'*4;assert crc(page)==stored,'CRC'
  s,seq=struct.unpack_from('<II',page,14);assert seq==len(pages),'sequence';serial=s if serial is None else serial;assert s==serial,'serial';assert bool(page[5]&1)==bool(pending),'missing continuation state'
  at=27+count;complete=0
  for n in laces:
   pending+=page[at:at+n];at+=n
   if n<255:packets.append(bytes(pending));pending=b'';complete+=1
  pages.append({'packet_ends':complete,'granule':struct.unpack_from('<Q',page,6)[0],'bytes':len(page),'flags':page[5]});pos=end
 assert not pending,'unterminated packet';return packets,pages
original=pathlib.Path('results/catalogue-current/opus/original.ogg').read_bytes();repaged=pathlib.Path('results/catalogue-current/opus/group-1.ogg').read_bytes();a,ap=parse(original);b,bp=parse(repaged);assert a==b;assert all(x['packet_ends']==1 for x in bp);assert ap[-1]['granule']==bp[-1]['granule'];negative=[]
for name,bad in [('truncated',repaged[:-1])]:
 try:parse(bad);raise RuntimeError('accepted invalid page')
 except AssertionError as e:negative.append({'case':name,'rejected':True,'reason':str(e)})
 (out/(name+'.ogg')).write_bytes(bad)
# Valid checksum with an invalid continuation flag tests state, not just CRC.
size=bp[0]['bytes'];bad=bytearray(repaged);bad[5]|=1;bad[22:26]=b'\0'*4;struct.pack_into('<I',bad,22,crc(bad[:size]));(out/'missing-continuation.ogg').write_bytes(bad)
try:parse(bad);raise RuntimeError('accepted missing continuation')
except AssertionError as e:negative.append({'case':'missing-continuation','rejected':True,'reason':str(e)})
repaging={'candidate_executed':'strict validation of existing actual repagination; host/browser execution reused, not rerun','all_packets_identical':True,'packets_including_headers':len(a),'source_pages':len(ap),'candidate_pages':len(bp),'source_bytes':len(original),'candidate_bytes':len(repaged),'additional_bytes':len(repaged)-len(original),'growth_percent':100*(len(repaged)/len(original)-1),'end_granule':bp[-1]['granule'],'adverse_controls':negative,'limits':['No real transport latency measurement','Whole-file reference/browser PCM reused from exact group-1 run','Repagination preserves packet grouping; separate from codec regrouping']}
(out/'repagination-results.json').write_text(json.dumps(repaging,indent=2)+'\n')
source=pathlib.Path('research/shared/runs/20260919T200716Z-ogg-crop/source.ogg').read_bytes();packets,pages=parse(source);head=bytearray(packets[0]);pre=struct.unpack_from('<H',head,10)[0];start,end=12345,67890;drop=9;skip=pre+start-drop*960;struct.pack_into('<H',head,10,skip)
def page(packet,seq,gp,flags):
 laces=[255]*(len(packet)//255)+[len(packet)%255];p=bytearray(b'OggS'+bytes([0,flags])+struct.pack('<QII',gp,0xB2345678,seq)+b'\0'*4+bytes([len(laces)])+bytes(laces)+packet);struct.pack_into('<I',p,22,crc(p));return p
n=(end+pre+959)//960;chunks=[page(head,0,0,2),page(packets[1],1,0,0)]
for i,p in enumerate(packets[2+drop:2+n]):chunks.append(page(p,i+2,min((i+1)*960,end+pre-drop*960),4 if i==n-drop-1 else 0))
(out/'short-preroll.ogg').write_bytes(b''.join(chunks));parse((out/'short-preroll.ogg').read_bytes());cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-i',str(out/'short-preroll.ogg'),'-c:a','pcm_f32le','-f','f32le',str(out/'short-preroll.f32')];p=subprocess.run(cmd,capture_output=True);assert p.returncode==0,p.stderr
actual=array.array('f',(out/'short-preroll.f32').read_bytes());reference=array.array('f',pathlib.Path('research/shared/runs/20260919T200716Z-ogg-crop/crop.f32').read_bytes());assert len(actual)==len(reference)
mismatch=sum(x!=y for x,y in zip(actual,reference));error=max(abs(x-y) for x,y in zip(actual,reference));assert mismatch>0,'This fixture did not falsify universal bit exactness'
trim={'passed':True,'profile':'Same crop with shortened 83.6875ms pre-skip versus complete retained prefix','candidate_executed':True,'fallback':False,'dropped_prefix_packets':drop,'remaining_preskip':skip,'remaining_preskip_ms':skip/48,'samples':len(actual),'mismatched_samples':mismatch,'max_absolute_error':error,'exact_crop_baseline':'research/shared/runs/20260919T200716Z-ogg-crop','conclusion':'80ms-style preroll is not a universal bit-exact state convergence guarantee; full retained prefix reference remains exact','limits':['One mono chirp/impulse fixture, not an audible-quality rejection or universal required preroll bound']}
(out/'trim-results.json').write_text(json.dumps(trim,indent=2)+'\n');(out/'commands.log').write_text(json.dumps(cmd)+'\n'+p.stderr.decode());print(json.dumps({'repaging':repaging,'trim':trim}))
