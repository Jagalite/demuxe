# SPDX-License-Identifier: Apache-2.0
import pathlib,json,hashlib,sys
root=pathlib.Path.cwd();out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=False)
base=root/'build/head-to-head/assets-component-isolation-01/demuxe';source=(base/'web/generated/internal/native-player.js').read_text()
module=pathlib.Path(__file__).with_name('whole-player-cue-owner.mjs').read_text();outputs={}
def once(s,a,b):
 assert s.count(a)==1,(a,s.count(a));return s.replace(a,b)
for mode in ['eager','window']:
 s="import {installCueOwner} from './r048-cue-owner.mjs';\n"+source
 s=once(s,'        if (cues) {',"        if (cues) { await installCueOwner(this,asset,cues,'"+mode+"');return;}\n        if (cues) {")
 s=once(s,'    async dispose() {\n        this.stopped = true;','    async dispose() {\n        this.stopped = true;\n        for(const owner of this.researchCueWindows??[])owner.destroy();')
 p=out/mode;p.mkdir();(p/'native-player.js').write_text(s);(p/'r048-cue-owner.mjs').write_text(module)
 for f in p.iterdir():outputs[str(f)]=hashlib.sha256(f.read_bytes()).hexdigest()
def stamp(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
cues=[{'start':i*2,'end':i*2+1.8,'text':f'CAPTION {i:05d}'} for i in range(10000)]
(out/'captions.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(c["start"])} --> {stamp(c["end"])}\n{c["text"]}' for i,c in enumerate(cues))+'\n')
(out/'oracle.json').write_text(json.dumps(cues)+'\n')
(out/'manifest.json').write_text(json.dumps({'source':str(base/'web/generated/internal/native-player.js'),'sourceSHA256':hashlib.sha256(source.encode()).hexdigest(),'outputs':outputs,'license':'Derived player GPL-3.0-or-later; original owner Apache-2.0; authored cues CC-BY-4.0','fixture':'Existing authored h264-fmp436s video/stereoAAC; cue timestamps extend beyond media intentionally to model a large caption document'},indent=2)+'\n')
