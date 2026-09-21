from build import *
# Persist failed first candidate rather than overwrite its evidence.
for left,right,label in [(8,8,'coherent8'),(32,0,'coherent32')]:
 ff('-i',F/'epoch0.mp4','-map','0:v:0','-c:v','copy','-bsf:v',f'h264_metadata=crop_left={left}:crop_right={right}:crop_top=8:crop_bottom=8:colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1','-tag:v','avc3','-video_track_timescale','1000','-movflags','empty_moov+frag_keyframe+default_base_moof+skip_trailer',F/(label+'_unpatched.mp4'))
 b=bytearray((F/(label+'_unpatched.mp4')).read_bytes());w=160-left-right;h=80
 for s,n,t in path(b,[b'moov',b'trak',b'tkhd']):b[s+n-8:s+n]=struct.pack('>II',w<<16,h<<16)
 for s,n,t in path(b,[b'moov',b'trak',b'mdia',b'minf',b'stbl',b'stsd',b'avc3']):b[s+32:s+36]=struct.pack('>HH',w,h)
 (F/(label+'.mp4')).write_bytes(b);probe(label+'.mp4')
# Establish explicit color throughout baseline, including repeating in-band SPS.
ff('-i',F/'epoch0.mp4','-map','0:v:0','-c:v','copy','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1','-tag:v','avc3','-video_track_timescale','1000','-movflags','empty_moov+frag_keyframe+default_base_moof+skip_trailer',F/'color_reference.mp4')
