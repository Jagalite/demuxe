"""D46. Explicit authority is supplied by the synthetic fixture contract, not inferred."""
from video_build import *
def choose(authority,sps,container):
 if sps==container:return sps
 if authority not in ['source_bitstream','container']:raise ValueError('conflicting color declarations require explicit provenance/policy')
 return sps if authority=='source_bitstream' else container
m=json.loads((E/'color_manifest.json').read_text())
for inp,target in [('sps709_colr601','color601'),('sps601_colr709','color709'),('sps709_colrfull','colorfull'),('spsfull_colr709','color709')]:
 code=6 if target=='color601' else 1;fullrange=target=='colorfull';name='resolved_'+inp
 ff('-i',F/f'{inp}.mp4','-an','-c:v','copy','-bsf:v',f'h264_metadata=colour_primaries={code}:transfer_characteristics={code}:matrix_coefficients={code}:video_full_range_flag={int(fullrange)}','-movflags','+frag_keyframe+empty_moov+default_base_moof+write_colr','-write_btrt','0',F/f'{name}.mp4')
 b=bytearray((F/f'{name}.mp4').read_bytes());p=b.index(b'colr');b[p+8:p+14]=p16(code)*3;b[p+14]=128 if fullrange else 0;(F/f'{name}.mp4').write_bytes(b)
 init,fs=split(bytes(b));(F/f'{name}.init').write_bytes(init);fn=[]
 for i,x in enumerate(fs):q=f'{name}_{i}.m4s';(F/q).write_bytes(x);fn.append(q)
 pp=probe(name+'.mp4');src=probe(inp+'.mp4');fields=['data_hash','pts','dts','duration','size']
 same=[{k:p.get(k)for k in fields} for p in pp['packets']]==[{k:p.get(k)for k in fields}for p in src['packets']]
 # Do not request a pixel-format conversion: full/limited range metadata must not trigger scaling in the oracle.
 dec=ff('-i',F/f'{name}.mp4','-c:v','rawvideo','-f','rawvideo','-')
 m[name]={'codec':getcodec(init),'init':name+'.init','fragments':fn,'requested_reference':target,'source':inp,'packet_and_timing_equal':same,'packet_hashes':[z['data_hash']for z in pp['packets']],'decoded_native_components_sha256':sha(dec),'authority':'container, explicitly chosen in fixture contract'}
for name,q in m.items():
 dec=ff('-i',F/f'{name}.mp4','-c:v','rawvideo','-f','rawvideo','-');q['decoded_native_components_sha256']=sha(dec)
try:choose(None,(1,1,1,0),(6,6,6,0));rejected=False
except ValueError:rejected=True
save('color_manifest.json',m);save('color_authority_controls.json',{'conflict_without_authority_rejected':rejected,'agreeing_without_authority_accepted':choose(None,(1,1,1,0),(1,1,1,0))==(1,1,1,0),'note':'policy guard is a prototype; source authority is provided by this authored test, not inferred from the media'})
print('color follow-up complete')
