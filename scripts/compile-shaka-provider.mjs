// SPDX-License-Identifier: Apache-2.0
// The optional vendor package retains pinned upstream bytes, without compiling core.
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {copyShakaAssets} from './copy-shaka-assets.mjs';
if(process.argv[2]!=='shaka')throw Error('Expected Shaka provider target');
const pin=await copyShakaAssets();
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit','--strict','--skipLibCheck','--target','ES2022','--moduleResolution','bundler','--module','ES2022','packages/provider-shaka/typecheck.ts'],{stdio:['ignore','pipe','pipe']});
for(const [name,fact]of Object.entries(pin.files)){const bytes=await readFile(name);if(bytes.length!==fact.bytes||createHash('sha256').update(bytes).digest('hex')!==fact.sha256)throw Error('Shaka deployed asset differs from pin: '+name);}
process.stdout.write('{}');
