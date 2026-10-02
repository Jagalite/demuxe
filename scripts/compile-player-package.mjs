// SPDX-License-Identifier: Apache-2.0
// Compile source directly, retaining per-output TypeScript provenance. No cached
// generated output, bundling, minification or arbitrary source glob enters core.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const config=JSON.parse(fs.readFileSync(path.join(root,'licensing/provider-packages.json'),'utf8'));
const allowed=new Set(config.playerCoreSources);
for(const source of allowed)if(source.startsWith('web/generated/'))throw Error('Cached generated output is not a core source: '+source);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const relative=file=>path.relative(root,file).split(path.sep).join('/');
const raw=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
if(raw.error)throw Error(ts.flattenDiagnosticMessageText(raw.error.messageText,'\n'));
const parsed=ts.parseJsonConfigFileContent(raw.config,ts.sys,root);
const program=ts.createProgram(parsed.fileNames,parsed.options);
const diagnostics=ts.getPreEmitDiagnostics(program);
if(diagnostics.length)throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCanonicalFileName:s=>s,getCurrentDirectory:()=>root,getNewLine:()=> '\n'}));
// Source-time imports of provider types are permitted only when erased. Every
// emitted JS and public declaration is checked again below without exceptions.
for(const source of program.getSourceFiles()){
 const name=relative(source.fileName);if(!allowed.has(name))continue;
 function visit(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   const typeOnly=ts.isImportDeclaration(node)?node.importClause?.isTypeOnly:node.isTypeOnly;
   if(!typeOnly){
    const ref=node.moduleSpecifier.text;
    const target=ref.startsWith('.')?path.posix.normalize(path.posix.join(path.posix.dirname(name),ref)).replace(/\.js$/,'.ts'):ref;
    if(!allowed.has(target))throw Error('Non-type provider import crosses core source boundary: '+name+' -> '+ref);
   }
  }
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){
   const arg=node.arguments[0];
   if(!ts.isStringLiteralLike(arg)&&!(config.playerCoreComputedImports[name]??[]).includes(arg.getText(source)))throw Error('Unreviewed dynamic provider acquisition: '+name+': '+arg.getText(source));
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
}
const outputs=new Map();
program.emit(undefined,(file,text,_bom,_onError,sources)=>{
 if(!sources?.length||!sources.every(s=>allowed.has(relative(s.fileName))))return;
 const name=relative(file);
 outputs.set(name,{data:text,inputs:sources.map(s=>relative(s.fileName))});
});
for(const source of allowed){
 if(!source.startsWith('src/'))outputs.set(source.startsWith('packages/player-core/')?source.slice('packages/player-core/'.length):source,{data:fs.readFileSync(path.join(root,source),'utf8'),inputs:[source]});
}
const qualificationFile='licensing/provider-runtime-qualification.json';
const qualification=JSON.parse(fs.readFileSync(path.join(root,qualificationFile),'utf8'));
const candidate=process.env.DEMUXE_PROVIDER_CANDIDATE==='1';
if(qualification.schema!==1||qualification.status!=='qualified'&&!candidate)throw Error('Provider core requires reviewed qualification or explicit candidate assembly');
if(!candidate){
 if(!qualification.evidence?.length||!qualification.sources)throw Error('Missing maintained provider qualification evidence');
 for(const item of qualification.evidence){
  const bytes=fs.readFileSync(path.join(root,item.path));
  if(sha(bytes)!==item.sha256||JSON.parse(bytes).passed!==true)throw Error('Changed or unsuccessful provider qualification evidence: '+item.path);
 }
 for(const source of allowed){if(qualification.sources[source]!==sha(fs.readFileSync(path.join(root,source))))throw Error('Core source changed after provider qualification: '+source);}
}
outputs.set('web/generated/internal/provider-build.js',{data:'// SPDX-License-Identifier: Apache-2.0\nexport const providerDeploymentEnabled = true;\nexport const qualifiedProviderIdentities = Object.freeze('+JSON.stringify(qualification.providers)+');\n',inputs:['src/internal/provider-build.ts',qualificationFile]});
const selected=new Map([...outputs].filter(([name])=>name.endsWith('.js')));
function references(name,text){
 const ast=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);const result=[];
 function add(expr){if(expr&&ts.isStringLiteralLike(expr))result.push(expr.text);}
 function visit(node){
  if(ts.isImportDeclaration(node)||ts.isExportDeclaration(node))add(node.moduleSpecifier);
  if(ts.isImportTypeNode(node))add(node.argument.literal);
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword)add(node.arguments[0]);
  ts.forEachChild(node,visit);
 }visit(ast);return result;
}
const metadata=JSON.parse(fs.readFileSync(path.join(root,'packages/player-core/package.json'),'utf8'));
const queue=Object.values(metadata.exports).map(entry=>entry.types.slice(2));
while(queue.length){
 const name=queue.shift();if(selected.has(name))continue;
 const output=outputs.get(name);if(!output)throw Error('Declaration crosses core package boundary: '+name);
 selected.set(name,output);
 for(const reference of references(name,output.data)){
  if(!reference.startsWith('.'))throw Error('External dependency in core declarations: '+reference);
  queue.push(path.posix.normalize(path.posix.join(path.posix.dirname(name),reference)).replace(/\.js$/,'.d.ts'));
 }
}
for(const [name,output]of selected){
 if(!name.endsWith('.js'))continue;
 for(const reference of references(name,output.data)){
  if(!reference.startsWith('.'))throw Error('External dependency in core code: '+reference);
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(name),reference));
  if(!selected.has(target))throw Error('Provider-owned or missing static import in core: '+name+' -> '+reference);
 }
}
const sources=Object.fromEntries([...new Set([...selected.values()].flatMap(o=>o.inputs))].map(name=>[name,{sha256:sha(fs.readFileSync(path.join(root,name)))}]));
process.stdout.write(JSON.stringify({compiler:ts.version,sources,outputs:Object.fromEntries(selected)}));
