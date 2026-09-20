# SPDX-License-Identifier: Apache-2.0
"""Run only after shared timing window release: independent packet oracle controls."""
import importlib.util,json,pathlib,subprocess,sys
base=pathlib.Path(__file__).parent
s=importlib.util.spec_from_file_location('builder',base/'rebuild-cues.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
source=pathlib.Path(sys.argv[1]);candidate=pathlib.Path(sys.argv[2]);out=pathlib.Path(sys.argv[3]);raw=source.read_bytes();new,meta=m.build(raw)
assert new==candidate.read_bytes()
def packets(p):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_packets','-show_data_hash','sha256','-of','json',str(p)]))['packets']
a,b=packets(source),packets(candidate)
fields=['stream_index','pts','dts','duration','size','flags','data_hash']
assert [[p.get(k)for k in fields]for p in a]==[[p.get(k)for k in fields]for p in b]
assert len(a)==len(meta['packets'])
for actual,own in zip(a,meta['packets']):
 assert actual['data_hash'].split(':',1)[1].lower()==own['sha256']
 assert ('K'in actual['flags'])==own['key']
 assert abs(float(actual['pts_time'])*1000-own['timestamp_ticks'])<0.001
assert [p['time']for p in meta['points']]==[p['timestamp_ticks']for p in meta['packets']if p['key']]
# Independent pre-existing FFmpeg-authored index is an oracle only; builder never reads it.
old=json.loads(pathlib.Path('research/shared/runs/20260919T221240Z-virtual-cues-sized/index.json').read_text())
assert [{'time':p['time'],'track':p['track'],'cluster':p['cluster']-old['segmentStart'],'relative':p['relative']}for p in old['points']]==meta['points']
controls=[]
for name,bad in [('truncated',raw[:-3]),('already_indexed',new),('missing_tail_void',raw[:meta['overlay_start']]),('bad_vint',b'\0'+raw[1:])]:
 try:m.build(bad)
 except(Exception,)as e:controls.append({'name':name,'rejected':True,'error':str(e)})
 else:raise AssertionError(name+' accepted')
result={'scope':'Independent FFprobe packet/PTS/keyflag oracle; no decoded-pixel or browser proof in this host check.','packets':len(a),'cue_points':len(meta['points']),'all_packet_identity_timing_flags_equal':True,'all_cues_independently_confirmed_key_packets':True,'all_cue_positions_match_independent_ffmpeg_authored_oracle':True,'controls':controls,'passed':True}
out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
