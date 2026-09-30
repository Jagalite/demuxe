// SPDX-License-Identifier: Apache-2.0
// Compile only the reviewed optional component sources; preserve exact provenance.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),config=JSON.parse(fs.readFileSync('licensing/provider-packages.json','utf8'));
const profile=config.profiles[process.argv[2]],allowed=new Set(profile.sources);
const out=path.join(root,'build/component-package-compiler');
const program=ts.createProgram([...allowed].map(p=>path.join(root,p)),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,moduleResolution:ts.ModuleResolutionKind.Bundler,strict:true,declaration:true,skipLibCheck:true,rootDir:path.join(root,'packages'),outDir:out});
const diagnostics=ts.getPreEmitDiagnostics(program);if(diagnostics.length)throw Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:s=>s,getNewLine:()=> '\n'}));
const outputs={};
program.emit(undefined,(file,data,_bom,_errors,sources)=>{
 if(!file.endsWith('.js')&&!file.endsWith('.d.ts'))return;
 const inputs=sources.map(s=>path.relative(root,s.fileName));if(inputs.some(p=>!allowed.has(p)))throw Error('Unreviewed component source dependency');
 outputs['web/providers/components/'+path.relative(out,file)]={data,inputs};
});
for(const [name,item]of Object.entries(outputs)){
 if(name.endsWith('.d.ts'))continue;
 const ast=ts.createSourceFile(name,item.data,ts.ScriptTarget.Latest,true);
 function visit(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   const ref=node.moduleSpecifier.text;
   if(!ref.startsWith('.')||!outputs[path.posix.normalize(path.posix.join(path.posix.dirname(name),ref))])throw Error('Component import escapes reviewed package closure: '+ref);
  }
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&!(profile.computedImports??[]).includes(node.arguments[0].getText(ast)))throw Error('Unreviewed dynamic component import');
  ts.forEachChild(node,visit);
 }
 visit(ast);
}
if(Object.keys(outputs).length!==allowed.size*2)throw Error('Incomplete component compiler output');
process.stdout.write(JSON.stringify(outputs));
