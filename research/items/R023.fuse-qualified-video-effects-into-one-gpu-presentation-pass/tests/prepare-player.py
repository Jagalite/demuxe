# SPDX-License-Identifier: Apache-2.0
import pathlib,shutil,os,subprocess
root=pathlib.Path.cwd();dst=root/'build/research-r023-player-01';src=root/'build/head-to-head/assets-component-vtt-review-fix-02';assert not dst.exists();dst.mkdir()
def patch(p,a,b):
 s=p.read_text();assert a in s,(p,a);p.unlink();p.write_text(s.replace(a,b))
for variant in ['canvas','gpu']:
 base=dst/variant; (base/'assets').mkdir(parents=True);shutil.copytree(src/'demuxe',base/'assets/demuxe',copy_function=os.link);shutil.copytree(src/'fixtures',base/'assets/fixtures',copy_function=os.link);shutil.copytree(root/'tests/head-to-head',base/'harness')
 filt='lavfi=[transpose=clock,negate]'
 patch(base/'assets/demuxe/web/generated/internal/playback-plans.js',"if (features.vf || features.toneMapping !== 'off')", "if ((features.vf && !(mode==='hybrid' && features.vf==='"+filt+"' && !features.af)) || features.toneMapping !== 'off')")
 patch(base/'assets/demuxe/web/generated/unified-player.js','if (vf)\n',"if (vf && !(mode==='hybrid' && vf==='"+filt+"'))\n")
 patch(base/'assets/demuxe/web/generated/internal/state.js',"const angle = p?.rotate ?? raw?.['demux-rotation'];","const angle = mode==='hybrid' ? 90 : p?.rotate ?? raw?.['demux-rotation'];")
 patch(base/'harness/adapters.mjs','await player.ready; await player.open',"await player.ready; window.r023Player=player; await player.setVideoFilters('"+filt+"'); await player.open")
 patch(base/'harness/adapters.mjs','width:960,height:540','width:180,height:320');patch(base/'harness/harness.html','width: 960px; height: 540px','width: 180px; height: 320px')
 p=base/'assets/demuxe/web/filter-retained-engine-worker.js'
 patch(p,"import {drawRetainedVideo} from './retained-video.js';","import {createPresenter} from './r023-presenter.js';let presenter;")
 patch(p,'drawRetainedVideo(context,frame,canvas,videoTrack);\n  subtitles.draw(context,request.overlay);','presenter.draw(frame,request.overlay,videoTrack);')
 patch(p,'drawRetainedVideo(context,heldFrame,canvas,videoTrack);subtitles.draw(context,overlay);','presenter.draw(heldFrame,overlay,videoTrack);')
 patch(p,"context = canvas.getContext('2d', {alpha:false});","presenter = await createPresenter(canvas,"+str(variant=='gpu').lower()+");")
 patch(p,'post({type:\'diagnostics\', data:{pumpTicks:ticks,',"post({type:'diagnostics', data:{researchPresenter:presenter?.kind,pumpTicks:ticks,")
 patch(p,'engine?._web_destroy();','presenter?.destroy();engine?._web_destroy();')
 shutil.copyfile(root/'research/items/R023.fuse-qualified-video-effects-into-one-gpu-presentation-pass/tests/presenter.js',base/'assets/demuxe/web/r023-presenter.js')
 subprocess.run(['ffmpeg','-v','error','-i',str(base/'assets/fixtures/h264-ass/index.mkv'),'-map','0','-c','copy','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-y',str(base/'assets/fixtures/r023-bt709.mkv')],check=True)
print(dst)
