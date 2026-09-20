# SPDX-License-Identifier: Apache-2.0
import pathlib,sys,subprocess,os,json,struct,hashlib,time,statistics,math
p=pathlib.Path(sys.argv[1]);source=pathlib.Path('research/shared/runs/20260920T000853Z-vorbis-parallel/source.ogg');exe=p/'floor_probe'
def execute(candidate=False,path=source):
 env=dict(os.environ)
 if candidate:env['DEMUXE_FLOOR_ONLY']='1'
 else:env.pop('DEMUXE_FLOOR_ONLY',None)
 r=subprocess.run([str(exe),str(path)],env=env,capture_output=True);return r

def parse(raw):
 rows=[];at=0
 while at<len(raw):
  seq,ch,n=struct.unpack_from('<qii',raw,at);at+=16;values=struct.unpack_from('<'+'f'*n,raw,at);at+=n*4;rows.append({'sequence':seq,'channel':ch,'bins':n,'values':values})
 assert at==len(raw);return rows
(p/'protocol.json').write_text(json.dumps({'scope':'Instrument libvorbis1.3.7 mapping0 after inverse floor1 coded-envelope reconstruction, before residue/coupling/MDCT; extract floor curve on unity vector. Candidate early returns before residue/MDCT; baseline full ordinary synthesis with same instrumentation is independent decoder-path oracle. No waveform/loudness/final-spectrum claim. Stereo native-FFmpeg Vorbis long-window source.','cost':'Five alternating cold file/process/header/setup/decode/capture/teardown jobs; candidate floor prefix plus common block handling vs instrumented complete decoder; endpoint identical sequence/channel/bin/floor curves. <=0.9 median, raw samples retained.'},indent=2))
ref=execute();got=execute(True);assert ref.returncode==got.returncode==0 and ref.stdout==got.stdout;(p/'baseline.curves').write_bytes(ref.stdout);(p/'candidate.curves').write_bytes(got.stdout);rows=parse(got.stdout);assert len(rows)>100 and any(max(r['values'])>0 for r in rows);wrong=bytearray(got.stdout);wrong[18]^=1;assert wrong!=ref.stdout
bad=p/'wrong-header.ogg';raw=source.read_bytes();bad.write_bytes(raw[:40]+bytes([raw[40]^1])+raw[41:]);badresult=execute(True,bad);assert badresult.returncode!=0
# Visible artifact is explicitly only coded floor envelope, not PCM spectrum.
selected=[rows[i]for i in [10,len(rows)//2,len(rows)-2]];lines=[]
for row,color in zip(selected,['#ed6a5a','#4d9de0','#4caf50']):
 points=[]
 for i in range(0,row['bins'],4):
  db=20*math.log10(max(row['values'][i],1e-7));points.append(f'{40+720*i/row["bins"]:.2f},{250-2*(db+120):.2f}')
 lines.append('<polyline fill="none" stroke="'+color+'" points="'+' '.join(points)+'"/>')
(p/'encoded-floor.svg').write_text('<!-- SPDX-License-Identifier: CC-BY-4.0 --><svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="800" height="300" fill="white"/><text x="40" y="20">Encoded Vorbis floor envelope — not waveform, loudness or final spectrum</text>'+''.join(lines)+'<text x="40" y="285">0–24 kHz · three packet/channel floor curves · logarithmic amplitude</text></svg>')
packets=json.loads(source.with_name('packets.json').read_text())['packets'];timing=[]
for row in rows:
 i=row['sequence']-3;assert 0<=i<len(packets);timing.append({'packetIndex':i,'channel':row['channel'],'packetPTS':int(packets[i]['pts']),'packetDuration':int(packets[i]['duration']),'rate':48000,'bins':row['bins']})
wrong=sum(a['values']!=b['values']for a,b in zip(rows[2:],rows[:-2]));assert wrong>100
(p/'packet-timing.json').write_text(json.dumps({'association':'Encoded floor belongs to packet index; packet PTS is nominal packet timing, not waveform/loudness timestamp. Negative initial overlap timestamp retained.','rows':timing,'onePacketMisassociationChangedCurves':wrong},indent=2))
times={'candidate':[],'baseline':[]}
for trial in range(6):
 for name in (['candidate','baseline']if trial%2==0 else ['baseline','candidate']):
  start=time.perf_counter_ns();out=execute(name=='candidate');ms=(time.perf_counter_ns()-start)/1e6;assert out.returncode==0 and out.stdout==ref.stdout
  if trial:times[name].append(ms)
med={k:statistics.median(v)for k,v in times.items()};ratio=med['candidate']/med['baseline'];(p/'results.json').write_text(json.dumps({'curves':len(rows),'first':{k:v for k,v in rows[0].items()if k!='values'},'last':{k:v for k,v in rows[-1].items()if k!='values'},'allCurveBytesExact':True,'malformedHeaderExit':badresult.returncode,'changedCurveDetected':True,'outputBytes':len(got.stdout),'sourceSHA256':hashlib.sha256(raw).hexdigest(),'scope':'Instrumented libvorbis actual coded floor curves; excludes residue, final spectrum, PCM, loudness'},indent=2));(p/'cost-results.json').write_text(json.dumps({'timesMS':times,'medianMS':med,'ratio':ratio,'passed':ratio<=.9},indent=2));(p/'commands.log').write_text('python3 research/shared/tooling/audio-stage-probes/build_vorbis_floor.py '+str(p)+'\nclang -O2 -I/tmp/demuxe-vorbis-floor/libvorbis-1.3.7/include -I/opt/homebrew/opt/libogg/include research/shared/tooling/audio-stage-probes/vorbis_floor_driver.c /tmp/demuxe-vorbis-floor/libvorbis-1.3.7/lib/.libs/libvorbis.a /opt/homebrew/opt/libogg/lib/libogg.a -lm -o '+str(exe)+'\npython3 research/shared/tooling/audio-stage-probes/vorbis_floor_probe.py '+str(p)+'\n');print(len(rows),med,ratio)
