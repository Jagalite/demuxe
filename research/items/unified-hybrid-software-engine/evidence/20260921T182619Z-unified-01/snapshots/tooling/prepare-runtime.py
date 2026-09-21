# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import shutil
BASE=Path('research/items/unified-hybrid-software-engine');OUT=Path((BASE/'active-run.txt').read_text().strip());rt=OUT/'runtime'
for name in ['filter-retained-engine-worker.js','software-full-engine-worker.js']:
 p=rt/'web'/name;s=p.read_text();s=s.replace('./engine-hybrid/player.mjs','./engine-unified/player.mjs').replace('./engine-software-full/player.mjs','./engine-unified/player.mjs');p.write_text(s)
p=rt/'web/generated/internal/engine-preparation.js';s=p.read_text();s=s.replace('    modules = new Map();','    modules = new Map();\n    sharedLoads = new Map();');s=s.replace('module(name) { return this.modules.get(name); }',"module(name) { return this.modules.get(['engine-hybrid','engine-software-full'].includes(name)?'engine-unified':name); }")
s=s.replace('    async readyModule(name) {',"    async readyModule(name) {\n        if(['engine-hybrid','engine-software-full'].includes(name)) await this.warm([name==='engine-hybrid'?'hybrid':'software']);")
s=s.replace('    async load(name) {','''    async load(name) {
        const key=name==='software' && this.software==='engine-software-full'?'hybrid':name;
        let task=this.sharedLoads.get(key);
        if(!task){task=this.loadAsset(key);this.sharedLoads.set(key,task);}
        const asset=await task;
        this.phase(name,asset.status);
        return {...asset,name};
    }
    async loadAsset(name) {''')
s=s.replace("name === 'hybrid' ? 'engine-hybrid' : this.software","name === 'hybrid' ? 'engine-unified' : this.software");s=s.replace('this.pending.clear();','this.pending.clear(); this.sharedLoads.clear();');p.write_text(s)
p=rt/'web/generated/unified-player.js';s=p.read_text();marker="        const prepared = mode === 'native' ? undefined :";assert marker in s;s=s.replace(marker,"        if(mode !== 'native') this.preparation ??= new EnginePreparation(this.assetBase, this.softwarePresenter === 'experimental-yuv' ? 'engine-software-yuv' : 'engine-software-full');\n"+marker);p.write_text(s)
# Harness selects unmodified frozen runtime for baseline and modified runtime for candidate.
s=Path('research/items/granular-engine-loading/tests/full/browser.mjs').read_text().replace("../../../../../scripts/qualification-foreground.mjs","../../../../scripts/qualification-foreground.mjs")
s=s.replace("const base='research/items/granular-engine-loading',out=(await readFile(base+'/full-run.txt','utf8')).trim(),old=(await readFile(base+'/active-run.txt','utf8')).trim(),runtime=path.resolve(old,'snapshots/runtime'),variant=process.env.VARIANT??'baseline'", "const base='research/items/unified-hybrid-software-engine',out=(await readFile(base+'/active-run.txt','utf8')).trim(),old='research/items/granular-engine-loading/evidence/20260921T162900Z-screen-01',variant=process.env.VARIANT??'baseline',runtime=variant==='unified'?path.resolve(out,'runtime'):path.resolve(old,'snapshots/runtime')")
s=s.replace("process.env.SOFTWARE??'original'","process.env.SOFTWARE??'software-baseline'")
s=s.replace("let file=u.pathname.startsWith('/web/engine-hybrid/')?", "let file=u.pathname.startsWith('/web/engine-unified/')?path.resolve(out,'variants/unified',path.basename(u.pathname)):u.pathname.startsWith('/web/engine-hybrid/')?")
s=s.replace("assert.equal(result.state.mode,expected);", "assert.equal(result.state.mode,expected);if(expected==='software')assert.equal(result.state.diagnostics.backend.decoder,'software');")
s=s.replace("await page.evaluate(()=>player.destroy());await page.waitForTimeout(250);", "result.compilePhases=await page.evaluate(()=>window.compilePhases);if(variant==='unified'){const engineRequests=requests.filter(x=>/engine-unified.*player.wasm$/.test(x.url));assert.equal(engineRequests.length,1,'Unified engine must download exactly once');assert.equal(result.compilePhases.filter(x=>x.bytes>20000000).length,1,'Unified engine must compile exactly once');assert.ok(!requests.some(x=>/engine-(hybrid|software-full)\\/player.wasm$/.test(x.url)));}await page.evaluate(()=>player.destroy());await page.waitForTimeout(250);")
(BASE/'tests/browser.mjs').write_text(s)
