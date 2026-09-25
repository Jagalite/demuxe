# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import shutil, hashlib, json, subprocess
root=Path('build/pcm24-routing'); root.mkdir(parents=True,exist_ok=True)
for directory in ['web','fixtures']:
    shutil.copytree(directory,root/directory,dirs_exist_ok=True)
p=root/'web/generated/unified-player.js'
s=p.read_text(); needle="!['ac3', 'dts'].includes(selectiveAudio.codec)"
assert s.count(needle)==1
s=s.replace(needle,"!['ac3', 'dts', 'pcm_s24le'].includes(selectiveAudio.codec)")
s=s.replace("['ac3', 'dts'].includes(t.codec)","['ac3', 'dts', 'pcm_s24le'].includes(t.codec)")
p.write_text(s)
files={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file()}
Path('results/pcm24-routing/manifest.json').write_text(json.dumps({'git':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'files':files},indent=2)+'\n')
# Diagnostic copies are never served to production and never used as valid playback arms.
for variant in ['fidelity','no-draw']:
    dest=Path('build/pcm24-'+variant)
    shutil.copytree(root,dest,dirs_exist_ok=True)
    if variant=='no-draw':
        p=dest/'web/retained-video.js';p.write_text(p.read_text().replace('export function drawRetainedVideo(context, frame, canvas, track) {','export function drawRetainedVideo(context, frame, canvas, track) { return;'))
    else:
        p=dest/'web/selective-sync-worklet.js';p.write_text(p.read_text().replace('Atomics.store(h, 1, (read + count) | 0);',"if(count && this.meta[(read%this.capacity)*2]>.5 && this.meta[(read%this.capacity)*2]<1.5)this.port.postMessage({kind:'capture',time:this.meta[(read%this.capacity)*2],samples:channels.map(c=>Array.from(c.slice(0,count))),sampleRate});\n    Atomics.store(h, 1, (read + count) | 0);"))
