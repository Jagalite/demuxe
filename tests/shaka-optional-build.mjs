// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {cp,mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

test('the main source builds without node_modules or any Shaka installation',async t=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'demuxe-without-shaka-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 await cp('src',path.join(root,'src'),{recursive:true});
 await cp('tsconfig.json',path.join(root,'tsconfig.json'));
 // Only the compiler runs from the checkout. Module resolution happens in the
 // isolated source tree, which contains neither dependencies nor vendor assets.
 execFileSync(process.execPath,[path.resolve('node_modules/typescript/bin/tsc'),'--project',path.join(root,'tsconfig.json')],{cwd:root});
 const generated=await readFile(path.join(root,'web/generated/internal/shaka-runtime.js'),'utf8');
 assert.doesNotMatch(generated,/from ['"]shaka-player['"]/);
});
