# SPDX-License-Identifier: Apache-2.0
import pathlib,shutil,os
src=pathlib.Path('build/research-r008-native-size-01');dst=pathlib.Path('build/research-r008-unrotated-01');assert not dst.exists();shutil.copytree(src,dst,copy_function=os.link)
def patch(p,a,b):
 s=p.read_text();assert a in s;(p.unlink());p.write_text(s.replace(a,b))
patch(dst/'harness/adapters.mjs',"setVideoFilters('lavfi=[transpose=clock]')","setVideoFilters('')")
patch(dst/'harness/adapters.mjs','width:180,height:320','width:320,height:180')
patch(dst/'harness/harness.html','width: 180px; height: 320px','width: 320px; height: 180px')
patch(dst/'assets/demuxe/web/filter-retained-engine-worker.js',"drawRetainedVideo(context,frame,canvas,{...videoTrack,'demux-rotation':90})",'drawRetainedVideo(context,frame,canvas,videoTrack)')
patch(dst/'assets/demuxe/web/generated/internal/state.js',"const angle = mode==='hybrid' ? 90 : p?.rotate ?? raw?.['demux-rotation'];","const angle = p?.rotate ?? raw?.['demux-rotation'];")
