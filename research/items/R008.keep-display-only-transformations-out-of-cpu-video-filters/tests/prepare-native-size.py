# SPDX-License-Identifier: Apache-2.0
import pathlib,shutil,os
src=pathlib.Path('build/research-r008-rotation-01');dst=pathlib.Path('build/research-r008-native-size-01');assert not dst.exists();shutil.copytree(src,dst,copy_function=os.link)
def patch(p,a,b):
 s=p.read_text();assert a in s,(p,a);p.unlink();p.write_text(s.replace(a,b))
patch(dst/'harness/adapters.mjs','width:960,height:540','width:180,height:320')
patch(dst/'harness/harness.html','width: 960px; height: 540px','width: 180px; height: 320px')
# Scope is isolated fixed-transform fixture runtime, not general admission.
patch(dst/'assets/demuxe/web/generated/internal/state.js',"const angle = p?.rotate ?? raw?.['demux-rotation'];","const angle = mode==='hybrid' ? 90 : p?.rotate ?? raw?.['demux-rotation'];")
p=dst/'assets/demuxe/web/filter-retained-engine-worker.js'
patch(p,"videoTrack=event.data?.find(t=>t.type==='video'&&t.selected);","{videoTrack=event.data?.find(t=>t.type==='video'&&t.selected);if(videoTrack&&((videoTrack['demux-rotation']||0)!==0||(videoTrack['demux-par']||1)!==1))throw Error('R008 unsupported source geometry');if(event.data?.some(t=>t.type==='sub'))throw Error('R008 subtitles not qualified');}")
print(dst)
