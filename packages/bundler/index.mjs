// SPDX-License-Identifier: Apache-2.0
import {readFile, readdir, lstat, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import ts from 'typescript';
import {embeddedRuntime, embeddedElements} from './embedded-runtime.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sort = value => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, sort(value[k])])) : value;
// Match the provider contract's Python JSON encoding, including ASCII escapes.
const encoded = value => Buffer.from((JSON.stringify(sort(value), null, 2) + '\n').replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')));
const safeName = name => {if (typeof name !== 'string' || name.includes('\\') || path.isAbsolute(name) || name.split('/').some(p => !p || p === '.' || p === '..')) throw Error('Unsafe package path: ' + name); return name;};
async function file(root, name) {
  safeName(name); let current = path.resolve(root);
  for (const segment of name.split('/')) {current = path.join(current, segment); if ((await lstat(current)).isSymbolicLink()) throw Error('Symlinked package file: ' + name);}
  if (!(await lstat(current)).isFile()) throw Error('Missing package file: ' + name);
  return readFile(current);
}
const json = async (root, name) => JSON.parse(await file(root, name));

/** Assemble installed packages, never compile native code or grant qualification. */
export async function collectPackages({core, providers = [], providerDirectory}) {
  if (!core) throw Error('core must be the installed demuxe package directory');
  if (providers === 'all') {
    if (!providerDirectory) throw Error('providers: all requires providerDirectory (the installed @demuxe directory)');
    providers = (await readdir(providerDirectory)).filter(n => n.startsWith('provider-')).sort().map(n => path.join(providerDirectory, n));
  }
  if (!Array.isArray(providers) || providers.some(p => typeof p !== 'string')) throw Error('providers must be all or an array of installed package directories');
  const coreLicenses=await json(core,'license-map.json');
  const metadata = await json(core, 'package.json'), files = new Map(), records = [], assets = new Map(), ids = new Set();
  if (metadata.name !== 'demuxe' || metadata.dependencies) throw Error('Expected standalone modular Demuxe core');
  for (const [name, licenses] of Object.entries(coreLicenses)) {
    if (JSON.stringify(licenses) !== '["Apache-2.0"]') throw Error('Non-Apache core file: ' + name);
    files.set(name, await file(core, name));
  }
  const facts = [['browser-original','media.present.original','selected-source'],['browser-prepared','media.present.prepared','selected-streams'],['web-audio-gain','audio.gain','scalar']].map(([id, capability, profile]) => ({id, implementationIdentity:'demuxe-browser-v1', technology:'browser-native', delivery:['browser','application-bundle'], applicationBuild:'demuxe-' + metadata.version, offers:[{capability, version:1, profile}]}));
  facts.forEach(f => ids.add(f.id)); const providerPaths = new Set();
  for (const root of providers) {
    const pkg = await json(root, 'package.json'), manifest = await json(root, 'provider-manifest.json');
    if (!/^@demuxe\/provider-[a-z0-9-]+$/.test(pkg.name)) throw Error('Invalid provider package name');
    if (manifest.providerContractVersion !== 1 || manifest.package !== pkg.name || manifest.version !== pkg.version || manifest.compatibleCore !== metadata.version || pkg.peerDependencies?.demuxe !== metadata.version) throw Error('Incompatible provider package: ' + pkg.name);
    const providerLicenses=await json(root,'license-map.json');
    const identity = 'sha256:' + hash(encoded(manifest.artifacts)), deployed = new Map();
    for (const [name, digest] of Object.entries(manifest.artifacts)) {
      if (!name.startsWith('runtime/')) throw Error('Provider artifact outside runtime/');
      const bytes = await file(root, name), target = safeName(name.slice(8));
      if (hash(bytes) !== digest) throw Error('Provider artifact integrity mismatch: ' + name);
      const sharedCore=target.startsWith('web/')&&/\.m?js$/.test(target)&&JSON.stringify(coreLicenses[target])==='["Apache-2.0"]'&&JSON.stringify(providerLicenses[name])==='["Apache-2.0"]';
      if (files.has(target) && (!files.get(target).equals(bytes) || (Object.hasOwn(coreLicenses,target)?!sharedCore:!providerPaths.has(target)))) throw Error('Runtime package collision: ' + target);
      files.set(target, bytes); providerPaths.add(target); deployed.set(target, {digest, bytes:bytes.length});
    }
    for (const asset of manifest.assets) {
      if (deployed.get(asset.path)?.digest !== asset.sha256 || deployed.get(asset.path)?.bytes !== asset.bytes || assets.has(asset.id) && !encoded(assets.get(asset.id)).equals(encoded(asset))) throw Error('Invalid provider asset: ' + asset.id);
      assets.set(asset.id, asset);
    }
    if (new Set(manifest.assets.map(a => a.path)).size !== deployed.size) throw Error('Incomplete provider inventory');
    for (const fact of manifest.provides) {
      if (ids.has(fact.id) || fact.implementationIdentity !== identity || fact.assetIds.some(id => !assets.has(id))) throw Error('Invalid provider identity/closure: ' + fact.id);
      ids.add(fact.id); facts.push(fact);
    }
    // Keep each package's license declarations and notices even when runtime
    // paths overlap. Corresponding native source publication remains a release gate.
    for (const name of ['LICENSE', 'license-map.json', 'provider-manifest.json', ...Object.keys(providerLicenses).filter(name => name.startsWith('THIRD_PARTY/'))]) files.set('third_party/providers/' + pkg.name.replace('@demuxe/', '') + '/' + name, await file(root, name));
    records.push({name:pkg.name, version:pkg.version, implementationIdentity:identity});
  }
  const body = {providers:facts, assets:[...assets.values()]};
  files.set('demuxe-providers.json', encoded({schema:1, providerContractVersion:1, revision:'sha256:' + hash(encoded(body)), ...body}));
  return {files, records, version:metadata.version, entry:metadata.exports['.'].import.slice(2), playerEntry:metadata.exports['./player'].import.slice(2)};
}

function rewrite(source, name, base, playerEntryForRewrite) {
  if (name.endsWith('/internal/runtime-worker.js')) return `export function runtimeWorker(url, options) { return new __demuxe.Worker(url, options); } export function installRuntimeWorkers() {}`;
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), edits = [];
  const replace = (node, text) => edits.push({start:node.getStart(ast), end:node.end, text});
  const visit = node => {
    if (name === playerEntryForRewrite && ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Player') {
      replace(node, '__demuxe.createElementPlayer(this, Player, ' + node.arguments.map(a => a.getText(ast)).join(', ') + ')'); return;
    }
    if (ts.isPropertyAccessExpression(node) && node.expression.kind === ts.SyntaxKind.MetaProperty && node.name.text === 'url') {replace(node, JSON.stringify(base + name)); return;}
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      replace(node.expression, '__demuxe.import');
      edits.push({start:node.arguments.end, end:node.arguments.end, text:', ' + JSON.stringify(base + name)});
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'fetch') replace(node.expression, '__demuxe.fetch');
    else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && ['Worker','XMLHttpRequest'].includes(node.expression.text)) replace(node.expression, '__demuxe.' + node.expression.text);
    else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && ['globalThis','self','window','owner'].includes(node.expression.text) && ['Worker','fetch'].includes(node.name.text)) replace(node, '__demuxe.' + node.name.text);
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'addModule' && node.arguments.length) {
      const arg = node.arguments[0]; edits.push({start:arg.getStart(ast), end:arg.getStart(ast), text:'__demuxe.url('}, {start:arg.end, end:arg.end, text:')'});
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  edits.sort((a,b) => b.start - a.start || b.end - a.end);
  for (const e of edits) source = source.slice(0,e.start) + e.text + source.slice(e.end);
  return source;
}
const mime = name => /\.(js|mjs)$/.test(name) ? 'text/javascript' : name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.json') ? 'application/json' : name.endsWith('.ttf') ? 'font/ttf' : 'application/octet-stream';

export async function buildDemuxe(config) {
  const {delivery = 'assets', output} = config;
  if (!['assets','embedded'].includes(delivery) || !output) throw Error('delivery must be assets or embedded; output is required');
  const collected = await collectPackages(config), {files, entry, playerEntry} = collected;
  try {await lstat(output); throw Error('Output already exists: ' + output);} catch (error) {if (error.code !== 'ENOENT') throw error;}
  const manifest = {schema:1, delivery, version:collected.version, providers:collected.records, inputs:Object.fromEntries([...files].map(([name, data]) => [name, {bytes:data.length, sha256:hash(data)}]))};
  const emitted = new Map();
  if (delivery === 'assets') {
    for (const item of files) emitted.set('assets/' + item[0], item[1]);
    emitted.set('demuxe.mjs', Buffer.from(`// SPDX-License-Identifier: Apache-2.0\nexport * from './assets/${entry}';\nexport {definePlayerElement} from './assets/${playerEntry}';\nexport const assetBase = new URL('./assets/', import.meta.url).href;\n`));
  } else {
    const id = hash(encoded(manifest)).slice(0,24), base = 'https://demuxe.invalid/' + id + '/', key = 'demuxe.embedded.' + id, pack = {};
    const plugin = {name:'demuxe-runtime', setup(builder) {
      builder.onResolve({filter:/.*/}, args => {
        if (!args.importer) return {path:path.posix.normalize(args.path), namespace:'demuxe'};
        if (!args.path.startsWith('.')) throw Error('External import in runtime: ' + args.path);
        return {path:path.posix.normalize(path.posix.join(path.posix.dirname(args.importer), args.path)), namespace:'demuxe'};
      });
      builder.onLoad({filter:/.*/, namespace:'demuxe'}, args => {
        const data = files.get(args.path); if (!data) throw Error('Missing static runtime dependency: ' + args.path);
        return {contents:rewrite(data.toString(), args.path, base, playerEntry), loader:'js'};
      });
    }};
    for (const [name, data] of files) {
      pack[name] = {data:data.toString('base64'), mime:mime(name)};
      // Vendor Shaka is a classic script, fetched and executed by its owner.
      if (/\.(js|mjs)$/.test(name) && !name.startsWith('web/vendor/')) {
        const result = await build({entryPoints:[name], bundle:true, format:'esm', target:'es2022', platform:'browser', write:false, minify:true, legalComments:'inline', plugins:[plugin]});
        pack[name].code = result.outputFiles[0].text;
      }
    }
    const factory = embeddedRuntime.toString();
    const dataModule = `// SPDX-License-Identifier: Apache-2.0\nconst pack=${JSON.stringify(pack)};\nconst create=${factory};\nexport function start(url,key){return create(pack,${JSON.stringify(base)},key,url);}\n`;
    // No Blob URLs or browser APIs are touched during import (SSR safe).
    emitted.set('demuxe.mjs', Buffer.from(`// SPDX-License-Identifier: Apache-2.0\nconst source=${JSON.stringify(dataModule)};\nconst bindElements=${embeddedElements.toString()};\nlet shared,sequence=0;\nfunction dataModule(){return shared??=(async()=>{const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{return {start:(await import(url)).start,url};}finally{URL.revokeObjectURL(url);}})();}\nexport async function createDemuxeRuntime(){\n let runtime;\n try {const {start,url}=await dataModule();runtime=start(url,${JSON.stringify(key)}+'.'+url+'.'+(++sequence));const api=await runtime.import(${JSON.stringify(base + entry)});const player=await runtime.import(${JSON.stringify(base + playerEntry)});runtime.api=api;return {api,definePlayerElement:bindElements(runtime,player,${JSON.stringify(key)}),assetBase:runtime.assetBase,createPlayer:(container,options={})=>new api.Player(container,{...options,assetBase:runtime.assetBase}),diagnostics:()=>runtime.diagnostics(),dispose(){runtime.dispose();}};}\n catch(error){runtime?.dispose();throw error;}\n}\n`));
  }
  manifest.outputs = Object.fromEntries([...emitted].map(([name,data]) => [name,{bytes:data.length,sha256:hash(data)}]));
  // Validate and compile completely before creating the destination.
  await mkdir(path.dirname(output), {recursive:true});
  await mkdir(output);
  for (const [name,data] of emitted) {const target=path.join(output,name);await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data,{flag:'wx'});}
  await writeFile(path.join(output,'bundle-manifest.json'), encoded(manifest), {flag:'wx'});
  return manifest;
}
