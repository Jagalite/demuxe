# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,ast,struct,json,array,subprocess,concurrent.futures,time,statistics,hashlib
T=[]
for i in range(256):
 c=i<<24
 for _ in range(8):c=((c<<1)^0x04c11db7 if c&0x80000000 else c<<1)&0xffffffff
 T.append(c)
tree=ast.parse(pathlib.Path(__file__).with_name('opus_stream_extract.py').read_text());exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['unpack','page']],type_ignores=[]),__file__,'exec'))
def decode(path):return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','f32le','-'],stderr=subprocess.DEVNULL)
def construct(raw,rows,start,end,prior=True):
 packets,_=unpack(raw);headers=packets[:3];coded=packets[3:];first=start-1 if prior else start;out=[page(h,i,0,2 if i==0 else 0)for i,h in enumerate(headers)];at=0
 for i in range(first,end):
  if i>first:at+=int(rows[i]['duration'])
  out.append(page(coded[i],len(out),at,4 if i==end-1 else 0))
 return b''.join(out)
def main():
 p=pathlib.Path(sys.argv[1]);raw=(p/'source.ogg').read_bytes();rows=json.loads((p/'packets.json').read_text())['packets'];packets,_=unpack(raw);assert len(packets)==len(rows)+3;reference=decode(p/'source.ogg');cuts=[1,49,97,145,len(rows)];outputs=[];jobs=[];controls=[]
 (p/'protocol.json').write_text(json.dumps({'scope':'Actual long-block stereoVorbis fixture; four initialized packet ranges each with one preceding overlap packet. Rebuild Ogg pages/granules and keep full identification/comment/setup. Compare complete192000stereo frames and each seam. No short/long-transition generalization.','cost':'Five alternating cold source read/hash/CRC parse/repage four ranges/write/launch four host decoders concurrently/transfer/join versus one full decoder, same interleaved float endpoint;<=0.9 median.'},indent=2))
 for start,end in zip(cuts,cuts[1:]):
  path=p/f'job-{start}.ogg';path.write_bytes(construct(raw,rows,start,end));out=decode(path);expected=reference[int(rows[start]['pts'])*8:(int(rows[end-1]['pts'])+int(rows[end-1]['duration']))*8];outputs.append(out);jobs.append({'start':start,'end':end,'frames':len(out)//8,'exact':out==expected});wrong=p/f'wrong-{start}.ogg';wrong.write_bytes(construct(raw,rows,start,end,False));controls.append(decode(wrong)!=expected)
 (p/'initial-results.json').write_text(json.dumps({'jobs':jobs,'wrongNoPreroll':controls,'frames':len(reference)//8},indent=2));assert all(r['exact']for r in jobs)and b''.join(outputs)==reference and all(controls),(jobs,len(reference))
 times={'candidate':[],'baseline':[]};identity=hashlib.sha256(raw).hexdigest()
 for trial in range(6):
  for variant in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
   starttime=time.perf_counter_ns();data=(p/'source.ogg').read_bytes();assert hashlib.sha256(data).hexdigest()==identity
   if variant=='candidate':
    paths=[]
    for start,end in zip(cuts,cuts[1:]):
     path=p/f'timed-{start}.ogg';path.write_bytes(construct(data,rows,start,end));paths.append(path)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4)as pool:got=b''.join(pool.map(decode,paths))
   else:got=decode(p/'source.ogg')
   ms=(time.perf_counter_ns()-starttime)/1e6;assert got==reference
   if trial:times[variant].append(ms)
 med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'results.json').write_text(json.dumps({'jobs':jobs,'wrongNoPreroll':controls,'wholeExact':True,'frames':len(reference)//8,'allWorkersReaped':True},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/vorbis_overlap_parallel.py '+str(p)+'\n');print(jobs,med,ratio)
if __name__=='__main__':main()
