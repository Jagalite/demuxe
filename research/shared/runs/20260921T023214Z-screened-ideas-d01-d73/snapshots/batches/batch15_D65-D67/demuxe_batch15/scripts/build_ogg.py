# SPDX-License-Identifier: MIT
from common import *
import numpy as np
POLY=0x04c11db7
TABLE=[]
for x in range(256):
 v=x<<24
 for _ in range(8):v=((v<<1)^POLY if v&0x80000000 else v<<1)&0xffffffff
 TABLE.append(v)
def crc(b):
 c=0
 for v in b:c=((c<<8)&0xffffffff)^TABLE[((c>>24)^v)&255]
 return c
def pages(b):
 if len(b)>16*1024*1024:raise ValueError('file cap')
 p=0;out=[];states={}
 while p<len(b):
  if p+27>len(b) or b[p:p+4]!=b'OggS' or b[p+4]!=0:raise ValueError('invalid/truncated page')
  ns=b[p+26];h=p+27+ns
  if h>len(b):raise ValueError('truncated lacing')
  ls=b[p+27:h];end=h+sum(ls)
  if end>len(b):raise ValueError('truncated payload')
  raw=b[p:end];v=bytearray(raw);v[22:26]=bytes(4)
  if crc(v)!=int.from_bytes(raw[22:26],'little'):raise ValueError('CRC')
  sid=int.from_bytes(raw[14:18],'little');seq=int.from_bytes(raw[18:22],'little');flags=raw[5]
  if flags&~7:raise ValueError('flags')
  if sid not in states:
   if len(states)>=4:raise ValueError('stream cap')
   if not flags&2 or seq!=0 or flags&1:raise ValueError('missing BOS')
   states[sid]={'seq':-1,'eos':False,'continued':False}
  s=states[sid]
  if s['eos'] or seq!=s['seq']+1 or (seq!=0 and flags&2):raise ValueError('sequence/epoch')
  if bool(flags&1)!=s['continued']:raise ValueError('continuation')
  s.update(seq=seq,eos=bool(flags&4),continued=bool(ls and ls[-1]==255))
  if s['eos'] and s['continued']:raise ValueError('unfinished packet')
  if len(out)>=4096:raise ValueError('page cap')
  out.append({'start':p,'end':end,'serial':sid,'seq':seq,'flags':flags,'granule':int.from_bytes(raw[6:14],'little'),'hash':sha(raw)})
  p=end
 if not out or not all(s['eos'] for s in states.values()):raise ValueError('incomplete stream')
 return out

def project(b,sid,identity,mode='select-one'):
 if mode!='select-one' or sha(b)!=identity:raise ValueError('request/source identity')
 pp=pages(b);sel=[p for p in pp if p['serial']==sid]
 if not sel:raise ValueError('unknown serial')
 return b''.join(b[p['start']:p['end']] for p in sel),sel

def main():
 n=60013;t=np.arange(n);fs=[]
 for j in range(2):
  # Independent deterministic signed 24-bit signals, stored left-justified in S32.
  a=np.stack([((t*(1597+j*2222)+t*t*(j+3))%12000001)-6000000,((t*(2399+j*777)+911+j*5521)%14000001)-7000000],1).astype(np.int32)
  raw=(a<<8).astype('<i4').tobytes();(F/f'ogg{j}.s32').write_bytes(raw)
  ff('-f','s32le','-ar','48000','-ac','2','-i',F/f'ogg{j}.s32','-c:a','flac','-bits_per_raw_sample','24','-fflags','+bitexact','-flags:a','+bitexact',F/f'ogg{j}.flac')
 ff('-i',F/'ogg0.flac','-i',F/'ogg1.flac','-map','0:a','-map','1:a','-c:a','copy','-fflags','+bitexact','-f','ogg',F/'multiplexed.oga')
 b=(F/'multiplexed.oga').read_bytes();ps=pages(b);sids=list(dict.fromkeys(p['serial'] for p in ps));rec={'frames':n,'channels':2,'rate':48000,'source_bytes':len(b),'source_sha':sha(b),'streams':[],'pages':ps,'controls':{}}
 for i,sid in enumerate(sids):
  v,sp=project(b,sid,sha(b));fn=f'selected{i}.oga';(F/fn).write_bytes(v)
  oracle=ff('-i',F/'multiplexed.oga','-map',f'0:a:{i}','-c:a','pcm_s32le','-f','s32le','-')
  host=ff('-i',F/fn,'-c:a','pcm_s32le','-f','s32le','-');src=(F/f'ogg{i}.s32').read_bytes()
  # Separate host demux/decoder checks, not used by the projection.
  packets=packet_summary(fn);orig=packet_summary('multiplexed.oga');original=[q for q in orig if q['stream_index']==i]
  rec['streams'].append({'serial':sid,'file':fn,'bytes':len(v),'pages':len(sp),'page_hashes':[p['hash'] for p in sp],'packets':len(packets),'packet_hashes_exact':[q['data_hash'] for q in packets]==[q['data_hash'] for q in original], 'host_equals_selected_source':host==src==oracle,'host_bytes':len(host)})
 bad=bytearray(b);bad[-1]^=1
 negatives={'crc':bytes(bad),'truncated':b[:-5],'missing_page':b[:ps[4]['start']]+b[ps[4]['end']:], 'missing_eos':b[:ps[-1]['start']]}
 for k,v in negatives.items():
  try:project(v,sids[0],sha(v));rec['controls'][k]={'rejected':False}
  except ValueError as e:rec['controls'][k]={'rejected':True,'error':str(e)}
 for k,sid,ident,mode in [('wrong_source',sids[0],'0'*64,'select-one'),('unknown_serial',987654,sha(b),'select-one'),('mix_request',sids[0],sha(b),'mix-all')]:
  try:project(b,sid,ident,mode);rec['controls'][k]={'rejected':False}
  except ValueError as e:rec['controls'][k]={'rejected':True,'error':str(e)}
 save('ogg_manifest.json',rec);print(json.dumps({k:v for k,v in rec.items() if k!='pages'},indent=2))
if __name__=='__main__':main()
