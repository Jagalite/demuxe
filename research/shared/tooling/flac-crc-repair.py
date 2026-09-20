# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,json,hashlib,random,struct,time,statistics
p=pathlib.Path(sys.argv[1]);rng=random.Random(311);raw=struct.pack('<2048h',*[rng.randrange(-32768,32768) for _ in range(2048)]);(p/'source.s16').write_bytes(raw);cmd=['ffmpeg','-v','error','-f','s16le','-ar','48000','-ac','1','-i',str(p/'source.s16'),'-c:a','flac','-compression_level','0','-frame_size','512','-y',str(p/'source.flac')];r=subprocess.run(cmd,capture_output=True,timeout=15);assert r.returncode==0,r.stderr;b=(p/'source.flac').read_bytes();idx=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_entries','packet=pos,size','-of','json',str(p/'source.flac')]))['packets'];extent=idx[0];start=int(extent['pos']);n=int(extent['size']);frame=b[start:start+n];expected=hashlib.sha256(frame).hexdigest()
def crc(buf):
 c=0
 for x in buf:
  c^=x<<8
  for _ in range(8):c=((c<<1)^0x8005)&65535 if c&32768 else(c<<1)&65535
 return c
assert crc(frame)==0
def table(n):
 t={};syndrome=0x8005
 for bit in range(n*8-1,-1,-1):t.setdefault(syndrome,[]).append(bit);syndrome=((syndrome<<1)^0x8005)&65535 if syndrome&32768 else(syndrome<<1)&65535
 return t
def repair(buf,identity,t):
 if not identity:raise ValueError('missing independently trusted identity')
 c=crc(buf)
 if not c:return bytes(buf) if hashlib.sha256(buf).hexdigest()==identity else None
 for bit in t.get(c,[]):
  temp=bytearray(buf);temp[bit//8]^=1<<(7-bit%8)
  if hashlib.sha256(temp).hexdigest()==identity:return bytes(temp)
 return None
def baseline(buf,identity):
 temp=bytearray(buf)
 for bit in range(len(buf)*8):
  mask=1<<(7-bit%8);temp[bit//8]^=mask
  if hashlib.sha256(temp).hexdigest()==identity:return bytes(temp)
  temp[bit//8]^=mask
 return None
positions=[rng.randrange(n*8) for _ in range(12)];damaged=[]
for bit in positions:
 q=bytearray(frame);q[bit//8]^=1<<(7-bit%8);damaged.append(q)
t=table(n);assert all(repair(q,expected,t)==frame for q in damaged);two=bytearray(frame);two[20]^=1;two[40]^=2;assert repair(two,expected,t) is None
forged=bytearray(frame);forged[20]^=1;check=crc(forged[:-2]);forged[-2:]=check.to_bytes(2,'big');assert crc(forged)==0 and repair(forged,expected,t) is None
try:repair(damaged[0],None,t);raise AssertionError('missing trust admitted')
except ValueError:pass
assert repair(damaged[0],'0'*64,t) is None
rows=[]
for pair in range(7):
 for mode in (['candidate','baseline'] if pair%2 else ['baseline','candidate']):
  at=time.perf_counter();lookup=table(n) if mode=='candidate' else None
  for q in damaged:assert (repair(q,expected,lookup) if mode=='candidate' else baseline(q,expected))==frame
  rows.append({'pair':pair,'mode':mode,'ms':(time.perf_counter()-at)*1000})
repaired=b[:start]+repair(damaged[0],expected,t)+b[start+n:];assert repaired==b;(p/'repaired.flac').write_bytes(repaired);decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(p/'repaired.flac'),'-f','s16le','-']);assert decoded==raw
ratios=[next(r['ms'] for r in rows if r['pair']==i and r['mode']=='candidate')/next(r['ms'] for r in rows if r['pair']==i and r['mode']=='baseline') for i in range(7)];result={'rows':rows,'frameBytes':n,'positions':positions,'expectedSHA256':expected,'trust':'Expected digest supplied from separately authored trusted fixture; never derived from damaged bytes. Known authenticated frame extent and explicit single-bit model. No source reread available in this recovery scenario.','controls':{'twoBitRejected':True,'crcValidHashInvalidRejected':True,'missingIdentityRejected':True,'wrongIdentityRejected':True},'medianCostRatio':statistics.median(ratios),'range':[min(ratios),max(ratios)],'baseline':'Direct SHA256 candidate enumeration, avoiding unnecessary repeated fullCRC work. Candidate charges fresh syndrome-table construction per12-repair job.','passed':True};(p/'result.json').write_text(json.dumps(result,indent=2)+'\n');print({k:result[k] for k in ['frameBytes','medianCostRatio','range']})
