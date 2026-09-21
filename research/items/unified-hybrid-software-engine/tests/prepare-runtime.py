# SPDX-License-Identifier: Apache-2.0
from run_guard import resolve_run, require_writable_run
from pathlib import Path
import shutil
BASE=Path('research/items/unified-hybrid-software-engine');OUT=resolve_run(BASE);rt=OUT/'runtime'
require_writable_run(OUT)
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
