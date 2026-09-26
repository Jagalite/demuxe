# SPDX-License-Identifier: Apache-2.0
"""Independent verification of captured browser-bound FLAC/MP4 prefixes."""
import array,json,pathlib,subprocess,sys,math
root=pathlib.Path(sys.argv[1]);run=json.loads((root/'result.json').read_text());results=[]
def probe(f,select,frames=False):
 cmd=['ffprobe','-v','error','-select_streams',select]
 if frames:cmd+=['-read_intervals','%+#4','-show_frames','-show_entries','frame=pts_time,nb_samples,sample_fmt,channel_layout']
 else:cmd+=['-show_packets','-show_data_hash','sha256','-show_entries','packet=pts_time,data_hash']
 return json.loads(subprocess.check_output(cmd+['-of','json',str(f)]))['frames' if frames else 'packets']
def pcm(f):
 data=subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-map','0:a:0','-t','2','-c:a','pcm_f64le','-f','f64le','pipe:1']);a=array.array('d');a.frombytes(data);return a
for t in run['trials']:
 f=root/(t['id']+'-prefix.mp4');row={'id':t['id'],'browserLifecyclePassed':bool(t.get('accepted'))};results.append(row)
 if not f.exists():row['status']='no captured prefix';continue
 try:
  source=pathlib.Path(t['fixture']);original=probe(source,'v:0');copied=probe(f,'v:0');assert 30<len(copied)<=len(original)
  assert all(a['data_hash']==b['data_hash'] for a,b in zip(original,copied))
  shifts=[float(b['pts_time'])-float(a['pts_time']) for a,b in zip(original,copied)];assert max(shifts)-min(shifts)<2e-6
  pa,pb=probe(source,'a:0',True),probe(f,'a:0',True);assert pa and pb
  fixture=next(c for c in run['fixtureManifest']['cases'] if c['id']==t['id']);srcstream=next(s for s in fixture['probe']['streams'] if s['codec_type']=='audio')
  audio_shift=float(pb[0]['pts_time'])-float(pa[0]['pts_time']);timing_error=audio_shift-shifts[0]
  # Source Matroska timestamps have millisecond precision, regardless of sample rate.
  assert abs(timing_error)<.0021,('A/V timestamp shift differs',timing_error)
  audio=pcm(f);reference=pcm(source);n=min(len(audio),len(reference));assert n>=fixture['sampleRate']*fixture['channels']
  errors=[audio[i]-reference[i] for i in range(n)];rms=math.sqrt(sum(x*x for x in errors)/n);peak=max(map(abs,errors))
  sourcefmt=pa[0]['sample_fmt'];bits=srcstream.get('bits_per_raw_sample',srcstream.get('bits_per_sample',0));integer=sourcefmt.startswith(('s16','s32'))
  exact_required=srcstream['codec_name'] in ['pcm_s16le','pcm_s24le','flac','alac','truehd'] and integer and int(bits or 24)<=24
  row.update(videoPackets=len(copied),videoPayloadsExact=True,videoPTSShift=shifts[0],audioPTSShift=audio_shift,avShiftErrorSeconds=timing_error,sourceFormat=sourcefmt,sourceLayout=pa[0].get('channel_layout'),outputLayout=pb[0].get('channel_layout'),comparedChannelSamples=n,maxAbsError=peak,rmsError=rms,exactIntegerRequired=exact_required,exactSamples=peak==0)
  if row['sourceLayout'] is None and fixture['channels']<=2:
   expected='mono' if fixture['channels']==1 else 'stereo'
   assert fixture['layoutRequested']==expected and row['outputLayout']==expected
   row['layoutEvidence']='Source layout unspecified; authored mono/stereo channel markers and channel count checked, not inferred surround'
  else:
   assert row['sourceLayout']==row['outputLayout'],('Channel layout changed',row['sourceLayout'],row['outputLayout'])
  if exact_required:assert peak==0,('Integer lossless sample mismatch',peak)
  else:assert peak<2e-5,('Quantized/native-vs-Wasm PCM discrepancy',peak)
  row['status']='passed'
 except Exception as e:row['status']='failed';row['error']=repr(e)
 print(row['id'],row['status'],row.get('maxAbsError'),row.get('error',''),flush=True)
 (root/'media-verification.json').write_text(json.dumps(results,indent=2)+'\n')
(root/'media-verification.json').write_text(json.dumps(results,indent=2)+'\n')
assert all(r['status']=='passed' for r in results),'Some media comparisons failed or unavailable; retained'
