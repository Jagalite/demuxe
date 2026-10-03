// SPDX-License-Identifier: Apache-2.0
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(process.argv[2]??process.env.DEMUXE_AUDIT_ROOT??path.join(__dirname,'..'));const output=path.resolve(process.argv[3]??path.join(root,'docs/functional-core-audit'));fs.mkdirSync(output,{recursive:true});const files=[];
function walk(dir){for(const item of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=path.join(dir,item.name);if(item.isDirectory()){if(!name.includes('/machine'))walk(name);}else if(/\.(ts|js)$/.test(name))files.push(name);}}
walk('src');walk('web/private-mpv');walk('web/webgpu');for(const name of fs.readdirSync(path.join(root,'web')))if(name.endsWith('.js')&&!/^(player-demo|benchmark-progress|ablation-|gap-|subtitle-perf)/.test(name))files.push('web/'+name);
const rows=[],derived=[],dynamic=[],closures=[],registrations=[],manifest={};
for(const file of files){const text=fs.readFileSync(path.join(root,file),'utf8'),sourceHash=require('node:crypto').createHash('sha256').update(text).digest('hex'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true),classes=new Map(),nonStorage=new Map();manifest[file]=sourceHash;
 function at(node){return source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;}
 function visit(node,scope){
  if(ts.isCallExpression(node)||ts.isNewExpression(node)){
   const callee=node.expression.getText(source);if(/(?:^|\.)(?:then|catch|finally|setTimeout|setInterval|queueMicrotask|addEventListener|onStop|Promise)$/.test(callee))registrations.push({file,sourceHash,line:at(node),callee,callbacks:(node.arguments??[]).filter(argument=>ts.isIdentifier(argument)||ts.isArrowFunction(argument)||ts.isFunctionExpression(argument)).map(argument=>argument.getText(source).slice(0,180)),review:'Syntactic potentially retained callback registration; actual cardinality/lifetime requires named owner review.'});
  }
  if(ts.isElementAccessExpression(node)){
   let cursor=node;while(ts.isPropertyAccessExpression(cursor.parent)||ts.isElementAccessExpression(cursor.parent))cursor=cursor.parent;
   const assigned=ts.isBinaryExpression(cursor.parent)&&cursor.parent.left===cursor&&cursor.parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&cursor.parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment;
   const updated=(ts.isPrefixUnaryExpression(cursor.parent)||ts.isPostfixUnaryExpression(cursor.parent))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(cursor.parent.operator);
   if(assigned||updated)dynamic.push({file,sourceHash,scope:scope??'<module-or-closure>',line:at(node),expression:node.getText(source).slice(0,300),computed:!ts.isStringLiteral(node.argumentExpression)&&!ts.isNumericLiteral(node.argumentExpression)});
  }
  if((ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isFunctionDeclaration(node))&&node.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword))closures.push({file,sourceHash,scope:scope??'<module>',line:at(node),name:node.name?.getText(source)??'<async closure>',review:'Async activation retention requires effect/resource analysis; not a mutable class field.'});

  if(ts.isClassDeclaration(node)||ts.isClassExpression(node)){scope=node.name?.text??'<anonymous>';if(!classes.has(scope)){classes.set(scope,new Map());nonStorage.set(scope,new Map());}for(const member of node.members)if(ts.isMethodDeclaration(member)||ts.isGetAccessorDeclaration(member)||ts.isSetAccessorDeclaration(member))nonStorage.get(scope).set(member.name.getText(source),ts.isMethodDeclaration(member)?'method':'derived-accessor');}
  if(scope){const fields=classes.get(scope);
   function field(name){if(!fields.has(name))fields.set(name,{file,sourceHash,scope,field:name,declaration:null,writes:[],mutations:[],reads:[],type:null,initializer:null});return fields.get(name);}
   if(ts.isParameter(node)&&node.modifiers?.some(m=>[ts.SyntaxKind.PrivateKeyword,ts.SyntaxKind.PublicKeyword,ts.SyntaxKind.ProtectedKeyword,ts.SyntaxKind.ReadonlyKeyword].includes(m.kind))){const entry=field(node.name.getText(source));entry.declaration=at(node);entry.type=node.type?.getText(source)??null;entry.readonly=!!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ReadonlyKeyword);}
   if(ts.isPropertyDeclaration(node)&&node.name){const entry=field(node.name.getText(source));entry.declaration=at(node);entry.type=node.type?.getText(source)??null;entry.initializer=node.initializer?.getText(source).slice(0,220)??null;entry.readonly=!!node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ReadonlyKeyword);}
   if(ts.isPropertyAccessExpression(node)&&node.expression.kind===ts.SyntaxKind.ThisKeyword){const entry=field(node.name.getText(source));const parent=node.parent;let cursor=node;while(ts.isPropertyAccessExpression(cursor.parent)||ts.isElementAccessExpression(cursor.parent))cursor=cursor.parent;
    if(ts.isBinaryExpression(cursor.parent)&&cursor.parent.left===cursor&&cursor.parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&cursor.parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment)entry.writes.push(at(node));
    else if((ts.isPrefixUnaryExpression(cursor.parent)||ts.isPostfixUnaryExpression(cursor.parent))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(cursor.parent.operator))entry.writes.push(at(node));
    else if(ts.isCallExpression(cursor.parent)&&ts.isPropertyAccessExpression(cursor)&&/^(set|add|delete|clear|push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)$/.test(cursor.name.text))entry.mutations.push(at(node));
    else entry.reads.push(at(node));
   }
  }
  ts.forEachChild(node,n=>visit(n,scope));
 }
 visit(source,null);
 for(const statement of source.statements)if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)if(ts.isIdentifier(declaration.name)&&(!(statement.declarationList.flags&ts.NodeFlags.Const)||declaration.initializer&&(ts.isNewExpression(declaration.initializer)||ts.isArrayLiteralExpression(declaration.initializer)||ts.isObjectLiteralExpression(declaration.initializer)))){
  const name=declaration.name.text,row={file,sourceHash,scope:'<module>',field:name,declaration:at(declaration),writes:[],mutations:[],reads:[],type:null,initializer:declaration.initializer?.getText(source).slice(0,220)??null,readonly:!!(statement.declarationList.flags&ts.NodeFlags.Const)};
  function references(node){if(ts.isIdentifier(node)&&node.text===name&&node!==declaration.name){let cursor=node;while(ts.isPropertyAccessExpression(cursor.parent)||ts.isElementAccessExpression(cursor.parent))cursor=cursor.parent;
   if(ts.isBinaryExpression(cursor.parent)&&cursor.parent.left===cursor&&cursor.parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&cursor.parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment)row.writes.push(at(node));
   else if((ts.isPrefixUnaryExpression(cursor.parent)||ts.isPostfixUnaryExpression(cursor.parent))&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(cursor.parent.operator))row.writes.push(at(node));
   else if(ts.isCallExpression(cursor.parent)&&ts.isPropertyAccessExpression(cursor)&&/^(set|add|delete|clear|push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin)$/.test(cursor.name.text))row.mutations.push(at(node));else row.reads.push(at(node));
  }ts.forEachChild(node,references);}references(source);rows.push(row);
 }
 for(const fields of classes.values())for(const row of fields.values())if(row.declaration||row.writes.length||row.mutations.length){if(nonStorage.get(row.scope)?.has(row.field)){derived.push({...row,kind:nonStorage.get(row.scope).get(row.field)});continue;}for(const key of ['writes','mutations','reads'])row[key]=[...new Set(row[key])];rows.push(row);}
}
fs.writeFileSync(path.join(output,'mutable-fields.raw.json'),JSON.stringify(rows,null,2)+'\n');
fs.writeFileSync(path.join(output,'derived-facades.raw.json'),JSON.stringify(derived,null,2)+'\n');
fs.writeFileSync(path.join(output,'dynamic-writes.raw.json'),JSON.stringify(dynamic,null,2)+'\n');
fs.writeFileSync(path.join(output,'async-closures.raw.json'),JSON.stringify(closures,null,2)+'\n');
function policies(dir){for(const item of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){const name=path.join(dir,item.name);if(item.isDirectory())policies(name);else if(name.endsWith('.ts'))manifest[name]=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');}}
policies('src/internal/machine');
for(const name of ['scripts/generated-runtime-files.mjs','scripts/package-beta.py','package.json','docs/FUNCTIONAL-CORE-WORKER-SCOPE.md'])manifest[name]=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex');
fs.writeFileSync(path.join(output,'callback-registrations.raw.json'),JSON.stringify(registrations,null,2)+'\n');
fs.writeFileSync(path.join(output,'source-hashes.json'),JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()),null,2)+'\n');
const counts={};for(const row of rows)counts[row.file]=(counts[row.file]??0)+1;console.log(JSON.stringify(counts,null,2));console.log('Total',rows.length);
