from common import *
def main():
 run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=160x96:rate=20:duration=4','-an','-c:v','libx264','-preset','medium','-crf','20','-g','20','-bf','2','-sc_threshold','0','-x264-params','open-gop=0:force-cfr=1','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-movflags','+frag_keyframe+empty_moov+default_base_moof','-video_track_timescale','20000','-write_btrt','0',F/'ordered.mp4'])
 b=(F/'ordered.mp4').read_bytes();top=boxes(b);fs=[i for i,q in enumerate(top) if q['type']=='moof'];init=b[:top[fs[0]]['start']];(F/'order.init').write_bytes(init)
 q=init.index(b'avcC');manifest={'init':'order.init','codec':'avc1.'+init[q+5:q+8].hex(),'fragments':[]};probes=[]
 all_packets=probe('ordered.mp4')['packets'];decoded=run(['ffmpeg','-v','error','-i',F/'ordered.mp4','-f','rawvideo','-pix_fmt','yuv420p','-']);assert len(decoded)==80*160*96*3//2
 for j,i in enumerate(fs):
  assert top[i+1]['type']=='mdat';frag=b[top[i]['start']:top[i+1]['end']];name=f'order{j}.m4s';(F/name).write_bytes(frag)
  (F/f'order_single{j}.mp4').write_bytes(init+frag);pp=probe(f'order_single{j}.mp4')['packets'];assert len(pp)==20 and 'K'in pp[0]['flags'];assert [p['data_hash']for p in pp]==[p['data_hash']for p in all_packets[j*20:(j+1)*20]]
  tfdt=find(frag,'moof/traf/tfdt');data=payload(frag,tfdt);t=int.from_bytes(data[4:12] if data[0]==1 else data[4:8],'big')
  manifest['fragments'].append({'file':name,'bytes':len(frag),'hash':sha(frag),'tfdt':t,'packets':len(pp),'first_pts':pp[0]['pts_time'],'first_dts':pp[0]['dts_time'],'pts_min':min(float(p['pts_time'])for p in pp),'pts_max':max(float(p['pts_time'])for p in pp)})
  if j==3:
   wrong=bytearray(frag);p=tfdt['payload']+4;wrong[p:p+(8 if data[0]==1 else 4)]=bytes(8 if data[0]==1 else 4);(F/'order3_wrong_time.m4s').write_bytes(wrong)
 save('order_manifest.json',manifest);save('ordered_component.json',{'fragments':manifest['fragments'],'whole_packets':len(all_packets),'host_frames':80,'host_yuv_sha':sha(decoded),'all_fragment_payloads_match_source':True});print(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
