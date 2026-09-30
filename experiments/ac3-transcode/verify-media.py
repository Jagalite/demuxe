#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Verify copied compressed video and quantify decoded audio in captured MSE prefixes."""
import array, json, pathlib, subprocess, sys, math
root=pathlib.Path(sys.argv[1]);result=json.loads((root/'result.json').read_text());fixture=result['fixture']
def packets(f):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts_time,data_hash','-of','json',str(f)]))['packets']
def pcm(f):
 a=array.array('f');a.frombytes(subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-map','0:a:0','-t','2','-c:a','pcm_f32le','-f','f32le','pipe:1']));return a
original=packets(fixture);reference=pcm(fixture);rows=[]
for lane in ['flac24','aac']:
 file=root/(lane+'-prefix.mp4');copied=packets(file);assert 100<len(copied)<=len(original)
 assert all(a['data_hash']==b['data_hash'] for a,b in zip(original,copied))
 shifts=[float(b['pts_time'])-float(a['pts_time']) for a,b in zip(original,copied)]
 assert max(shifts)-min(shifts)<.000002
 audio=pcm(file)
 # AAC encoder delay is 1024 samples, explicitly timestamped before the source PCM.
 delay=0 if lane=='flac24' else 1024
 n=min(len(reference),len(audio)-delay*2);delta=[audio[i+delay*2]-reference[i] for i in range(n)]
 rms=math.sqrt(sum(v*v for v in delta)/n);signal=math.sqrt(sum(reference[i]**2 for i in range(n))/n)
 rows.append({'lane':lane,'copiedVideoPackets':len(copied),'allVideoPacketHashesMatchSource':True,'constantVideoPTSShiftSeconds':shifts[0],'audioComparedChannelSamples':n,'aacPrimingSamplesExcludedFromPCMComparison':delay,'audioRmsError':rms,'audioMaxAbsError':max(abs(v) for v in delta),'audioSignalToErrorDB':20*math.log10(signal/max(rms,1e-30)),'caveat':'Native FFmpeg reference versus Wasm float decoder may differ in numerical rounding; no perceptual quality claim.'})
 if lane=='flac24':assert max(abs(v) for v in delta)<1e-6
print(json.dumps(rows,indent=2));(root/'media-verification.json').write_text(json.dumps(rows,indent=2)+'\n')
