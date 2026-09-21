# SPDX-License-Identifier: MIT
from common import *

def lpcm_to_wave(data,identity):
 source_guard(data,identity);cs=caf_chunks(data);rate,codec,flags,bpp,fpp,ch,bits=desc(cs);check_channel(cs,ch)
 if codec!=b'lpcm' or fpp!=1 or flags not in range(4):raise ValueError('not admitted LPCM')
 if rate!=48000. or ch!=2:raise ValueError('sample rate not qualified')
 fp=bool(flags&1)
 if (fp and bits!=32) or (not fp and bits not in [16,24]):raise ValueError('bit representation not qualified')
 width=bits//8
 if bpp!=ch*width:raise ValueError('unpacked or noninterleaved PCM excluded')
 raw=cs[b'data'][1][4:]
 if len(raw)%bpp or len(raw)//bpp>2_000_000:raise ValueError('PCM extent/profile cap')
 if any(t not in [b'desc',b'data',b'chan',b'info',b'free'] for t in cs):raise ValueError('uninterpreted semantic chunk')
 if fp and not np.isfinite(np.frombuffer(raw,dtype='<f4' if flags&2 else '>f4')).all():raise ValueError('nonfinite float not qualified')
 payload=raw if flags&2 else np.frombuffer(raw,dtype=np.uint8).reshape(-1,width)[:,::-1].copy().tobytes()
 out=wave(payload,int(rate),ch,bits,fp)
 return out,{'rate':int(rate),'channels':ch,'bits':bits,'float':fp,'frames':len(raw)//bpp,'sourcePayloadOffset':cs[b'data'][0]+4,'sourcePayloadBytes':len(raw),'byteSwap':not bool(flags&2),'payloadPreserved':payload==raw,'reversible':(payload if flags&2 else np.frombuffer(payload,dtype=np.uint8).reshape(-1,width)[:,::-1].copy().tobytes())==raw,'outputBytes':len(out),'sourceBytes':len(data),'payloadHash':sha(payload)}

def vint_read(d,p):
 v=0
 for _ in range(5):
  if p>=len(d):raise ValueError('truncated packet size')
  x=d[p];p+=1;v=(v<<7)|(x&127)
  if not x&128:return v,p
 raise ValueError('oversized packet size integer')
def opus_samples(p):
 if not p:raise ValueError('empty Opus packet')
 cfg=p[0]>>3;code=p[0]&3
 # Restricted one-frame, 20-ms CELT; source files are encoded at this contract.
 if code!=0 or cfg<16 or cfg%4!=3:raise ValueError('non-single-frame/20ms CELT profile')
 return 960

def caf_opus_to_ogg(d,identity):
 source_guard(d,identity);cs=caf_chunks(d);rate,codec,flags,bpp,fpp,ch,bits=desc(cs);check_channel(cs,ch)
 if (rate,codec,flags,bpp,fpp,bits)!=(48000.,b'opus',0,0,960,0) or ch!=2:raise ValueError('Opus CAF profile')
 if b'kuki' in cs:raise ValueError('unknown Opus cookie refused')
 if any(t not in [b'desc',b'data',b'chan',b'info',b'free',b'pakt'] for t in cs):raise ValueError('uninterpreted semantic chunk')
 if b'pakt' not in cs or len(cs[b'pakt'][1])<24:raise ValueError('packet table required')
 tab=cs[b'pakt'][1];n,valid,pre,rem=struct.unpack_from('>qqii',tab)
 if not 0<n<=4096 or not 0<=pre<=65535 or not 0<=rem<960 or valid<=0:raise ValueError('count bounds')
 p=24;payload=cs[b'data'][1][4:];off=0;ps=[]
 for _ in range(n):
  size,p=vint_read(tab,p)
  if not 0<size<=1275 or off+size>len(payload):raise ValueError('packet size outside data')
  q=payload[off:off+size];off+=size;opus_samples(q);ps.append(q)
 if off!=len(payload) or p!=len(tab):raise ValueError('unowned packet table/data bytes')
 if n*960!=valid+pre+rem:raise ValueError('packet duration does not reconcile')
 head=b'OpusHead'+bytes([1,ch])+struct.pack('<HIhB',pre,48000,0,0)
 tags=b'OpusTags'+struct.pack('<I',13)+b'Demuxe-screen'+struct.pack('<I',0)
 out=ogg_page(head,0,0,flags=2)+ogg_page(tags,0,1)
 for i,q in enumerate(ps):out+=ogg_page(q,(i+1)*960-rem if i==n-1 else (i+1)*960,i+2,flags=4 if i==n-1 else 0)
 parsed,_=ogg_packets(out)
 return out,{'packets':n,'validFrames':valid,'priming':pre,'remainder':rem,'framesBeforeTrim':n*960,'payloadBytes':len(payload),'payloadPreserved':ps==parsed[2:],'packetHashes':[sha(x) for x in ps],'sourceBytes':len(d),'outputBytes':len(out)}

def reject(fn,label,data):
 try:fn(data,sha(data));return {'case':label,'rejected':False}
 except ValueError as e:return {'case':label,'rejected':True,'reason':str(e)}

def main():
 rng=np.random.default_rng(16068);N=59377;t=np.arange(N);o={'pcm':{},'opus':{},'guards':[]}
 vals=np.stack([((t*7919+1703)%15000001)-7500000,((t*t*7+t*173)%14000003)-7000000],axis=1).astype(np.int32)
 raw24=np.stack([vals&255,(vals>>8)&255,(vals>>16)&255],axis=-1).astype(np.uint8).tobytes()
 s16=(vals//256).astype('<i2').tobytes()
 fp=np.stack([1.625*np.sin(t*.113)+rng.normal(0,.002,N),1.25*np.cos(t*.057)-.3],1).astype('<f4')
 fp[123:126]=[[1.75,-1.625],[0,0],[2**-20,-2**-21]]
 for name,raw,bits,isfp,codec,endian in [('float_le',fp.tobytes(),32,True,'pcm_f32le','little'),('float_be',fp.tobytes(),32,True,'pcm_f32be','big'),('s24_le',raw24,24,False,'pcm_s24le','little'),('s24_be',raw24,24,False,'pcm_s24be','big'),('s16_be',s16,16,False,'pcm_s16be','big')]:
  ref=wave(raw,48000,2,bits,isfp);(F/(name+'_ref.wav')).write_bytes(ref)
  cmd(FF+['-i',F/(name+'_ref.wav'),'-c:a',codec,F/(name+'.caf')]);data=(F/(name+'.caf')).read_bytes()
  out,m=lpcm_to_wave(data,sha(data));(F/(name+'_view.wav')).write_bytes(out)
  m['host']=compare(np.frombuffer(pcm(name+'.caf','f32le'),'<f4'),np.frombuffer(pcm(name+'_view.wav','f32le'),'<f4'))
  m['referenceFileRestoredExactly']=out==ref;m['maxReferenceFloat']=float(np.max(np.abs(np.frombuffer(pcm(name+'_ref.wav'),'<f4'))));o['pcm'][name]=m
 # Negatives: layout, count, flags, identity, interpreted semantic metadata.
 base=(F/'float_le.caf').read_bytes();cs=caf_chunks(base)
 d=bytearray(base);struct.pack_into('>I',d,cs[b'desc'][0]+16,4);o['guards'].append(reject(lpcm_to_wave,'wrong packet stride',bytes(d)))
 d=bytearray(base);struct.pack_into('>I',d,cs[b'desc'][0]+12,11);o['guards'].append(reject(lpcm_to_wave,'unqualified flags',bytes(d)))
 for label,d in [('truncated chunk',base[:-1]),('uninterpreted region',base+b'regn'+struct.pack('>q',0))]:o['guards'].append(reject(lpcm_to_wave,label,d))
 try:lpcm_to_wave(base,'0'*64);ok=False
 except ValueError:ok=True
 o['guards'].append({'case':'source identity','rejected':ok})
 # Intentionally wrong endian output remains syntactically valid; use S24 finite samples to avoid float overflow.
 b=(F/'s24_be.caf').read_bytes();raw=caf_chunks(b)[b'data'][1][4:];(F/'s24_wrong_endian.wav').write_bytes(wave(raw,48000,2,24))
 # Opus continuous reference has explicit real encoding delay and end trim in Ogg.
 mono=(.45*np.sin(t*.061)+rng.normal(0,.025,N)).astype('<f4')
 stereo=np.stack([mono, .37*np.cos(t*.101)+rng.normal(0,.02,N)],1).astype('<f4')
 (F/'opus_input.wav').write_bytes(wave(stereo.tobytes(),48000,2,32,True))
 cmd(FF+['-i',F/'opus_input.wav','-c:a','libopus','-b:a','128k','-application','lowdelay','-frame_duration','20',F/'opus_ref.ogg'])
 ps,g=ogg_packets((F/'opus_ref.ogg').read_bytes());pre=struct.unpack_from('<H',ps[0],10)[0];valid=N;rem=(len(ps)-2)*960-valid-pre
 cmd(FF+['-i',F/'opus_ref.ogg','-map','0:a:0','-c:a','copy',F/'opus_streamcopy.caf'])
 badcopy=(F/'opus_streamcopy.caf').read_bytes();o['streamCopyDescription']=list(desc(caf_chunks(badcopy)));o['streamCopyDescription'][1]='opus';o['guards'].append(reject(caf_opus_to_ogg,'emitted duration disagrees with Opus TOC',badcopy))
 cmd(FF+['-i',F/'opus_input.wav','-c:a','libopus','-b:a','128k','-application','lowdelay','-frame_duration','20',F/'opus_emitted.caf'])
 emitted=(F/'opus_emitted.caf').read_bytes();ce=caf_chunks(emitted);et=ce[b'pakt'][1];o['emittedTable']=list(struct.unpack_from('>qqii',et))
 # Author the truthful CAF table from source encoder priming/end metadata, keeping all coded packets.
 marked=bytearray(emitted);struct.pack_into('>qqii',marked,ce[b'pakt'][0],len(ps)-2,valid,pre,rem);(F/'opus_declared.caf').write_bytes(marked)
 for name in ['opus_emitted','opus_declared']:
  d=(F/(name+'.caf')).read_bytes();out,m=caf_opus_to_ogg(d,sha(d));(F/(name+'_view.ogg')).write_bytes(out);m['packetHashesMatchOggReference']=m['packetHashes']==[sha(x) for x in ps[2:]]
  m['hostOutputFrames']=len(pcm(name+'_view.ogg'))//8;m['hostOriginalCAFFrames']=len(pcm(name+'.caf'))//8
  # Reference: published table applied to complete same-packet decoder output. For truthful table, compare original Ogg as well.
  original=np.frombuffer(pcm(name+'.caf'),'<f4').reshape(-1,2);v=np.frombuffer(pcm(name+'_view.ogg'),'<f4').reshape(-1,2)
  reference=original[m['priming']:m['priming']+m['validFrames']]
  m['hostVsTableAppliedCAF']=compare(v,reference)
  if name=='opus_declared':m['hostVsOriginalOgg']=compare(v,np.frombuffer(pcm('opus_ref.ogg'),'<f4').reshape(-1,2))
  o['opus'][name]=m
 # Wrong trim control is internally consistent but violates the source table request.
 d=bytearray(marked);off=ce[b'pakt'][0];struct.pack_into('>qqii',d,off,len(ps)-2,valid+pre,0,rem)
 (F/'opus_no_priming.ogg').write_bytes(caf_opus_to_ogg(bytes(d),sha(d))[0])
 d=bytearray(marked);struct.pack_into('>i',d,off+20,rem+1);o['guards'].append(reject(caf_opus_to_ogg,'inconsistent declared packet duration',bytes(d)))
 d=bytes(marked);o['guards'].append(reject(caf_opus_to_ogg,'truncated packet table',d[:-1]))
 # Preserve unknown codec cookies rather than guess their content.
 o['guards'].append(reject(caf_opus_to_ogg,'unknown Opus cookie',d+b'kuki'+struct.pack('>q',1)+b'\0'))
 bad=bytearray(d);bad[ce[b'desc'][0]+24:ce[b'desc'][0]+28]=struct.pack('>I',6);o['guards'].append(reject(caf_opus_to_ogg,'multichannel semantics',bytes(bad)))
 save('caf_manifest.json',o);print(json.dumps(o,indent=2))

if __name__=='__main__':main()
