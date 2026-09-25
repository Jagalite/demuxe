# SPDX-License-Identifier: Apache-2.0
"""Extend an unconsumed specialist asset snapshot with nine explicit library cases."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root=Path(sys.argv[1]).resolve()
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest=json.loads((root/'manifest.json').read_text())
for name, entry in manifest['files'].items():
    assert sha(root/name)==entry['sha256'], name
out=root/'fixtures/library'
out.mkdir()
catalogue=json.loads((root/'specialist.json').read_text())
commands=[]
def run(args):
    r=subprocess.run(args,capture_output=True,text=True)
    commands.append({'argv':args,'exit':r.returncode,'stderr':r.stderr})
    (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
    r.check_returncode()
    return r.stdout
run(['ffmpeg','-nostdin','-v','error','-i',str(root/'fixtures/aac.mp4'),'-an','-c:v','libx265','-preset','ultrafast','-pix_fmt','yuv420p10le','-x265-params','pools=none:frame-threads=1:log-level=error:keyint=30:colorprim=bt2020:transfer=smpte2084:colormatrix=bt2020nc:master-display=G(13250,34500)B(7500,3000)R(34000,16000)WP(15635,16450)L(10000000,1):max-cll=1000,400',str(out/'source-hdr10.mkv')])
specs=[
 ('hevc10-aac-mkv','HEVC Main 10 + AAC / MKV','hevc10','aac',None),
 ('hevc10-flac-mkv','HEVC Main 10 + FLAC / MKV','hevc10','flac',None),
 ('hevc10-opus-mkv','HEVC Main 10 + Opus / MKV','hevc10','libopus',None),
 ('hevc10-flac-ass','HEVC Main 10 + FLAC + ASS / MKV','hevc10','flac','ass'),
 ('hevc10-opus-ass','HEVC Main 10 + Opus + ASS / MKV','hevc10','libopus','ass'),
 ('hdr10-truehd-pgs','HEVC Main 10 HDR10 + TrueHD 7.1 + PGS / MKV','hdr10','hevc-truehd','sup'),
 ('hdr10-dtshd-pgs','HEVC Main 10 HDR10 + DTS-HD MA 7.1 + PGS / MKV','hdr10','hevc-dtshd','sup'),
 ('dv5-atmos-ass','Dolby Vision profile 5 + E-AC-3/Atmos + ASS / MKV','dv5','hevc-atmos','ass'),
 ('dv81-atmos-ass','Dolby Vision profile 8.1 + E-AC-3/Atmos + ASS / MKV','dv81','hevc-atmos','ass')]
for key,label,video,audio,subtitle in specs:
    source=root/'fixtures'/catalogue[video]['file'] if video.startswith('dv') else root/'fixtures'/('source-'+video+'.mkv')
    if video=='hdr10': source=out/'source-hdr10.mkv'
    args=['ffmpeg','-nostdin','-v','warning','-i',str(source)]
    copied=audio.startswith('hevc-')
    if copied:
        args+=['-i',str(root/'fixtures'/catalogue[audio]['file'])]
    else:
        args+=['-f','lavfi','-i','aevalsrc=0.15*sin(2*PI*440*t)|0.15*sin(2*PI*880*t):s=48000:d=36:c=stereo']
    if subtitle:
        args+=['-i',str(root/'fixtures'/('captions.'+subtitle))]
    args+=['-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','copy' if copied else audio]
    if audio=='libopus': args+=['-b:a','192k']
    if subtitle:
        args+=['-map','2:s:0','-c:s','copy','-disposition:s:0','default']
    target=out/(key+'.mkv')
    args+=['-t','36','-avoid_negative_ts','disabled',str(target)]
    run(args)
    probe=json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]))
    v=next(s for s in probe['streams'] if s['codec_type']=='video')
    a=next(s for s in probe['streams'] if s['codec_type']=='audio')
    assert v['codec_name']=='hevc' and v['profile']=='Main 10' and v['pix_fmt']=='yuv420p10le'
    assert 35.5<float(probe['format']['duration'])<37
    if copied:
        original=next(s for s in catalogue[audio]['probe']['streams'] if s['codec_type']=='audio')
        for field in ['codec_name','profile','channels','channel_layout']: assert a.get(field)==original.get(field)
    else:
        assert a['codec_name']==('opus' if audio=='libopus' else audio) and a['channels']==2
    if video=='hdr10':
        assert v['color_transfer']=='smpte2084' and v['color_primaries']=='bt2020'
        frames=json.loads(run(['ffprobe','-v','error','-read_intervals','%+0.1','-select_streams','v:0','-show_frames','-show_entries','frame=color_primaries,color_transfer,color_space,side_data_list','-of','json',str(target)]))
        kinds={d['side_data_type'] for f in frames['frames'] for d in f.get('side_data_list',[])}
        assert {'Mastering display metadata','Content light level metadata'} <= kinds
        (out/(key+'-metadata.json')).write_text(json.dumps(frames,indent=2)+'\n')
    if video.startswith('dv'):
        d=next(s for s in v['side_data_list'] if s['side_data_type']=='DOVI configuration record')
        assert d['dv_profile']==(5 if video=='dv5' else 8) and d['rpu_present_flag']==1
    if subtitle:
        assert next(s for s in probe['streams'] if s['codec_type']=='subtitle')['codec_name']==('ass' if subtitle=='ass' else 'hdmv_pgs_subtitle')
    run(['ffmpeg','-nostdin','-v','error','-xerror','-i',str(target),'-map','0:v:0','-map','0:a:0','-f','null','-'])
    if subtitle == 'sup':
        # Independent host-rendered subtitle oracle, including PGS, not just codec tags.
        run(['ffmpeg','-nostdin','-v','error','-i',str(target),*(['-filter_complex','[0:v][0:s]overlay'] if subtitle=='sup' else ['-vf','subtitles='+str(target)]),'-ss','1','-frames:v','1',str(out/(key+'-oracle.png'))])
    catalogue[key]={'label':label,'file':str(target.relative_to(root/'fixtures')),'sha256':sha(target),'probe':probe,
                    'markedVideo':video=='hevc10','markedAudio':not copied,'sourceFixtures':[video,audio],
                    'qualificationLimit':'36-second bounded playback only; synthetic picture/audio for ordinary Main10 cases; repeated specialist audio and tagged synthetic HDR10 for UHD-style cases. No HDR, lossless, discrete surround or object fidelity qualification.'}
    if subtitle: catalogue[key].update(embeddedSubtitle=True,subtitleCheck='bitmap' if subtitle=='sup' else 'ass')
    print(key,'validated',flush=True)
(root/'specialist.json').write_text(json.dumps(catalogue,indent=2)+'\n')
for p in [root/'specialist.json',*out.rglob('*')]:
    if p.is_file():manifest['files'][str(p.relative_to(root))]={'sha256':sha(p),'bytes':p.stat().st_size}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
