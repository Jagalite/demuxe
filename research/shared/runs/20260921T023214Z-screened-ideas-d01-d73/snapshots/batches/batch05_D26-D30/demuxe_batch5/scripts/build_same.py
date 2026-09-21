from build import *
ff('-f','lavfi','-i','testsrc2=size=240x144:rate=20:duration=1.5','-vf','drawbox=x=21:y=11:w=11:h=17:color=white:t=fill','-an','-c:v','libx264','-preset','ultrafast','-threads','1','-pix_fmt','yuv420p','-profile:v','baseline','-level:v','3.0','-x264-params','keyint=10:min-keyint=10:scenecut=0:repeat-headers=1','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-tag:v','avc3','-video_track_timescale','1000','-movflags','empty_moov+frag_keyframe+default_base_moof+skip_trailer',F/'same_epoch.mp4')
b=(F/'same_epoch.mp4').read_bytes();init,fs=split_frag(b);(F/'same_init.mp4').write_bytes(init);names=[]
for i,f in enumerate(fs):
 n=f'same_frag{i}.m4s';(F/n).write_bytes(rewrite_time(f,1500+i*500));names.append(n)
probe('same_epoch.mp4');save('same_manifest.json',{'init':'same_init.mp4','fragments':names,'start':1.5,'size':[240,144],'file':'same_epoch.mp4'})
