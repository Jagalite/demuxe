// SPDX-License-Identifier: Apache-2.0
// Collect actual module imports, not arbitrary runtime URL strings.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(process.argv[2]??path.join(import.meta.dirname,'..'));
const generated=path.join(root,'web/generated');
const project=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const pending=[];
for(const entry of Object.values(project.exports))for(const value of typeof entry==='object'?Object.values(entry):[entry]){
 if(typeof value!=='string'||!value.startsWith('./web/generated/'))throw Error('Unexpected public entrypoint target: '+value);
 pending.push(path.resolve(root,value));
}
const seen=new Set();
while(pending.length){
 const file=pending.pop();if(seen.has(file))continue;
 if(!file.startsWith(generated+path.sep))throw Error('Public entrypoint escapes generated runtime');
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error('Missing generated runtime dependency: '+path.relative(root,file));
 seen.add(file);
 if(file.endsWith('.js')){const declaration=file.slice(0,-3)+'.d.ts';if(fs.existsSync(declaration))pending.push(declaration);}
 for(const {fileName} of ts.preProcessFile(fs.readFileSync(file,'utf8'),true,true).importedFiles){
  if(!fileName.startsWith('.')||!fileName.endsWith('.js'))continue;
  const target=path.resolve(path.dirname(file),fileName);
  if(target.startsWith(generated+path.sep)){
   const declaration=target.slice(0,-3)+'.d.ts';
   pending.push(file.endsWith('.d.ts')&&!fs.existsSync(target)&&fs.existsSync(declaration)?declaration:target);
  }
 }
}
process.stdout.write(JSON.stringify([...seen].map(file=>path.relative(root,file).split(path.sep).join('/')).sort())+'\n');
