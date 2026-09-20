# SPDX-License-Identifier: Apache-2.0
"""Isolated lab-only exact clockwise rotation admission; no production mutation."""
import pathlib,shutil,os,json,hashlib
root=pathlib.Path.cwd(); dst=root/'build/research-r008-rotation-01'; src=root/'build/head-to-head/assets-component-vtt-review-fix-02'
assert not dst.exists()
(dst/'assets').mkdir(parents=True)
shutil.copytree(src/'demuxe',dst/'assets/demuxe',copy_function=os.link)
shutil.copytree(src/'fixtures',dst/'assets/fixtures',copy_function=os.link)
shutil.copytree(root/'tests/head-to-head',dst/'harness',ignore=shutil.ignore_patterns('node_modules'))
def patch(p,a,b):
 text=p.read_text(); assert a in text,(p,a); p.unlink();p.write_text(text.replace(a,b))
p=dst/'assets/demuxe/web/generated/internal/playback-plans.js'
patch(p,"if (features.vf || features.toneMapping !== 'off')", "if ((features.vf && !(mode==='hybrid' && features.vf==='lavfi=[transpose=clock]' && !features.af)) || features.toneMapping !== 'off')")
p=dst/'assets/demuxe/web/generated/unified-player.js'
patch(p,"if (vf)\n", "if (vf && !(mode==='hybrid' && vf==='lavfi=[transpose=clock]'))\n")
p=dst/'assets/demuxe/web/filter-retained-engine-worker.js'
patch(p,'drawRetainedVideo(context,frame,canvas,videoTrack)',"drawRetainedVideo(context,frame,canvas,{...videoTrack,'demux-rotation':90})")
p=dst/'harness/adapters.mjs'
patch(p,'await player.ready; await player.open',"await player.ready; window.r008Player=player; await player.setVideoFilters('lavfi=[transpose=clock]'); await player.open")
print(dst)
