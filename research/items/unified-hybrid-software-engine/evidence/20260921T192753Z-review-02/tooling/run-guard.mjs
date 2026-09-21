// SPDX-License-Identifier: Apache-2.0
import {access,stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export async function requireWritableRun(run){
 const target=await realpath(run),evidence=fileURLToPath(new URL('../evidence/',import.meta.url));
 if(path.dirname(target)!==path.resolve(evidence)||!(await stat(target)).isDirectory())throw Error('UNIFIED_RUN must name an existing run in this item\'s evidence directory');
 let sealed=true;
 try{await access(path.join(target,'manifest.json'));}catch(error){if(error.code!=='ENOENT')throw error;sealed=false;}
 if(sealed)throw Error(`Sealed evidence is read-only: ${target}. Create a new run and set UNIFIED_RUN.`);
}
