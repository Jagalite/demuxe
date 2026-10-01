// SPDX-License-Identifier: Apache-2.0
// Describe compiled imports while retaining declarations in the artifact inventory.
import assert from 'node:assert/strict';
import path from 'node:path';
import ts from 'typescript';
export function providerAssetGraph(files,computedImports=[]){
 const names=Object.keys(files),available=new Set(names);
 const dependencies=Object.fromEntries(names.map(name=>[name,[]]));
 for(const name of names){
  if(!name.endsWith('.js')&&!name.endsWith('.mjs'))continue;
  const ast=ts.createSourceFile(name,files[name],ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),imports=[];
  const visit=node=>{
   if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier)imports.push(node.moduleSpecifier.text);
   if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){
    assert(node.arguments.length===1,'Invalid dynamic provider import');
    if(ts.isStringLiteral(node.arguments[0]))imports.push(node.arguments[0].text);
    else assert(computedImports.some(rule=>typeof rule==='string'?rule===node.arguments[0].getText(ast):rule.file===name&&rule.expression===node.arguments[0].getText(ast)),'Unreviewed computed provider import');
   }
   ts.forEachChild(node,visit);
  };visit(ast);
  for(const spec of imports)assert(spec.startsWith('.'),'Provider import escapes package: '+spec);
  dependencies[name]=[...new Set(imports.map(spec=>path.posix.normalize(path.posix.join(path.posix.dirname(name),spec))))];
  for(const target of dependencies[name])assert(available.has(target),'Missing compiled provider import: '+target);
  assert(dependencies[name].length<=64,'Too many provider dependencies');
 }
 const roots=names.filter(name=>!name.endsWith('.d.ts'));
 assert(roots.length>0&&roots.length<=64,'Provider needs bounded executable root assets');
 return {dependencies,roots};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
 let input='';for await(const chunk of process.stdin)input+=chunk;
 const config=JSON.parse(input);console.log(JSON.stringify(providerAssetGraph(config.files,config.computedImports)));
}
