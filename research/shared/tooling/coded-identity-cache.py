# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,json,subprocess,hashlib,time,tracemalloc,gc,statistics
import av
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True);original=pathlib.Path(sys.argv[2]);paths=[out/'source.mp4',out/'source.mkv',out/'source-fragmented.mp4'];paths[0].write_bytes(original.read_bytes())
for p in paths[1:]:subprocess.run(['ffmpeg','-v','error','-nostdin','-i',str(paths[0]),'-map','0:v','-c','copy',*(['-movflags','+frag_keyframe+empty_moov+default_base_moof'] if 'fragmented' in p.name else []),str(p)],check=True)
sha=lambda b:hashlib.sha256(b).hexdigest();authorized={str(p):sha(p.read_bytes()) for p in paths}
plan={'scope':'Actual MP4/Matroska/fragmented MP4 copies of owned AVC. Cache shares coded payload only, not source timestamps, configuration or authorization. Compare per-source immutable payload objects with source-bound config+payload SHA cache; all source reads/hash/demux/materialization included.','gate':'Full independent frame output plus payload/config/timeline/source authority controls. Nine alternating cold3source jobs; >=25percent measured owned retained allocation saving and <=1.25times complete cold CPU cost. Memory is tracemalloc live allocation, not processRSS.'};(out/'plan.json').write_text(json.dumps(plan,indent=2)+'\n')
def owner(p,cache=None,identity=None,permission=True):
 if not permission:raise ValueError('unauthorized source')
 data=p.read_bytes()
 if sha(data)!=(identity or authorized[str(p)]):raise ValueError('source changed')
 container=av.open(str(p));stream=container.streams.video[0];config=bytes(stream.codec_context.extradata);scope=(sha(config),stream.codec_context.name,stream.codec_context.width,stream.codec_context.height,stream.codec_context.pix_fmt);packets=[]
 try:
  for packet in container.demux(stream):
   if not packet.size:continue
   payload=bytes(packet);key=(*scope,sha(payload))
   if cache is not None:
    if key in cache:payload=cache[key]
    else:cache[key]=payload
   packets.append({'payload':payload,'pts':packet.pts,'dts':packet.dts,'duration':packet.duration,'time_base':str(packet.time_base),'key':packet.is_keyframe})
 finally:container.close()
 return {'source':str(p),'identity':sha(data),'scope':scope,'packets':packets}
def task(shared):
 cache={} if shared else None;owners=[owner(p,cache) for p in paths];return owners,cache
base,_=task(False);candidate,cache=task(True);assert base==candidate;assert all([p['payload'] for p in o['packets']]==[p['payload'] for p in base[0]['packets']] for o in base);assert len(cache)==144
# Configuration is deliberately in identity: changed configuration must never alias.
key=next(iter(cache));assert ('wrong-config',*key[1:]) not in cache
controls={}
for name,kwargs in [('changed',{'identity':'wrong'}),('authority',{'permission':False})]:
 try:owner(paths[0],cache,**kwargs);raise AssertionError(name)
 except ValueError:controls[name]=True
# Independent FFmpeg full pictures, every container. Timelines remain per-source; MKV millisecond rounding retained.
hashes=[]
for p in paths:
 raw=subprocess.check_output(['ffmpeg','-v','error','-nostdin','-i',str(p),'-pix_fmt','yuv420p','-fps_mode','passthrough','-f','rawvideo','-']);hashes.append(sha(raw))
assert len(set(hashes))==1
rows=[]
for pair in range(9):
 row={'pair':pair}
 for mode in (['shared','per-source'] if pair%2 else ['per-source','shared']):
  t=time.perf_counter();owners,cache=task(mode=='shared');assert owners==base;del owners,cache;row[mode]=(time.perf_counter()-t)*1000
 rows.append(row)
alloc={}
for mode in ['per-source','shared']:
 gc.collect();tracemalloc.start();start=tracemalloc.get_traced_memory()[0];owners,cache=task(mode=='shared');current,peak=tracemalloc.get_traced_memory();alloc[mode]={'liveBytes':current-start,'peakBytes':peak-start};del owners,cache;tracemalloc.stop()
ratio=statistics.median(r['shared']/r['per-source'] for r in rows);saving=1-alloc['shared']['liveBytes']/alloc['per-source']['liveBytes'];result={'plan':plan,'controls':{**controls,'configurationSeparate':True,'perSourceTimelineExact':True},'packetCountPerSource':len(base[0]['packets']),'payloadBytesPerSource':sum(len(p['payload']) for p in base[0]['packets']),'independentFullFrameHashes':hashes,'rows':rows,'allocation':alloc,'analysis':{'medianCostRatio':ratio,'retainedAllocationSaving':saving,'accepted':ratio<=1.25 and saving>=.25},'passed':True};(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['analysis','allocation']}))
