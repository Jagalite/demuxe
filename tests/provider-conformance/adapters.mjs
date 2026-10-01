// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {packageFile, sha} from './package.mjs';
import {collectHarnessInputs} from './harness-inputs.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
export async function loadAdapter(provider, fact, specification, outputDirectory) {
  const allowed = new Set(provider.artifactPaths(fact));
  const imports = [], harnessInputs = {};
  const staged = path.join(outputDirectory, 'candidate');
  const stagedInputs = {};
  await mkdir(staged, {recursive: true});
  await writeFile(path.join(staged, 'package.json'), '{"type":"module"}\n');
  for (const name of allowed) {
    const bytes = await packageFile(provider.root, 'runtime/' + name);
    assert.equal(sha(bytes), provider.manifest.artifacts['runtime/' + name], 'Candidate changed before staging');
    const destination = path.join(staged, name);
    await mkdir(path.dirname(destination), {recursive: true}); await writeFile(destination, bytes);
    stagedInputs[destination] = sha(bytes);
  }
  const graphChecked = new Set();
  const validateImports = async name => {
    if (graphChecked.has(name)) return;
    graphChecked.add(name);
    const {default: ts} = await import('typescript');
    const {isBuiltin} = await import('node:module');
    const source = (await packageFile(provider.root, 'runtime/' + name)).toString();
    const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const dependencies = [];
    const visit = node => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) dependencies.push(node.moduleSpecifier.text);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        assert.ok(node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]), 'Candidate computed import needs a reviewed custom adapter: ' + name);
        dependencies.push(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    for (const dependency of dependencies) {
      if (isBuiltin(dependency)) continue;
      assert.ok(dependency.startsWith('.'), 'Candidate import escapes package closure: ' + dependency);
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), dependency));
      assert.ok(allowed.has(target), 'Undeclared candidate import: ' + target);
      await validateImports(target);
    }
  };
  const readArtifact = async name => {
    assert.ok(allowed.has(name), 'Adapter artifact is outside the selected provider closure: ' + name);
    const bytes = await packageFile(provider.root, 'runtime/' + name);
    assert.equal(sha(bytes), provider.manifest.artifacts['runtime/' + name], 'Adapter artifact changed');
    imports.push(name); return bytes;
  };
  const importArtifact = async name => {
    await readArtifact(name);
    await validateImports(name);
    return import(pathToFileURL(path.join(staged, name)).href);
  };
  const options = specification?.options ?? {};
  const context = {providerId: fact.id, implementationIdentity: provider.identity, offers: fact.offers,
    options, importArtifact, readArtifact, outputDirectory};
  if (specification?.module) {
    Object.assign(harnessInputs, await collectHarnessInputs(specification.module));
    const module = await import(pathToFileURL(specification.module).href);
    assert.equal(typeof module.createAdapter, 'function', 'Custom adapter must export createAdapter(context)');
    const adapter = await module.createAdapter(context);
    return {adapter, imports, harnessInputs, stagedInputs, name: specification.module};
  }
  const adapter = {};
  const compileFixture = async filename => {
    const {build} = await import('esbuild');
    const source = path.join(repository, 'packages/provider-container/src', filename + '.ts');
    const bundled = await build({entryPoints: [source], bundle: true, write: false, format: 'esm', platform: 'node', metafile: true});
    for (const input of Object.keys(bundled.metafile.inputs)) {
      const file = path.resolve(input); harnessInputs[file] = sha(await readFile(file));
    }
    const file = path.join(outputDirectory, 'fixture-' + filename + '.mjs'); await writeFile(file, bundled.outputFiles[0].contents);
    harnessInputs[file] = sha(bundled.outputFiles[0].contents);
    return import(pathToFileURL(file).href);
  };
  const find = suffix => [...allowed].find(name => name.endsWith(suffix));
  const readerPath = options.reader ?? find('/provider-container/src/matroska.js');
  const writerPath = options.writer ?? find('/provider-container/src/fmp4.js');
  if (readerPath) {
    const {MatroskaReader} = await importArtifact(readerPath);
    adapter.openReader = (blob, signal) => MatroskaReader.open(blob, signal);
  }
  if (writerPath) {
    const {FragmentedMP4Writer} = await importArtifact(writerPath);
    adapter.createWriter = tracks => new FragmentedMP4Writer(tracks);
    if (!adapter.openReader) {
      const {MatroskaReader} = await compileFixture('matroska');
      adapter.fixtureReader = (blob, signal) => MatroskaReader.open(blob, signal);
    }
  }
  const factoryPath = options.factory ?? find('/module.mjs');
  const wasmPath = options.wasm ?? (factoryPath && factoryPath.slice(0, -4) + '.wasm');
  if (factoryPath && allowed.has(wasmPath)) {
    const factory = (await importArtifact(factoryPath)).default;
    const wasmBinary = await readArtifact(wasmPath);
    const module = await factory({wasmBinary});
    // These are test ABI adapters, recorded separately from provider artifacts.
    // The media implementation always comes from the verified candidate package.
    const compile = async (filename, exported) => {
      const source = path.join(repository, 'packages/provider-audio/src', filename + '.ts');
      const bytes = await readFile(source); harnessInputs[source] = sha(bytes);
      const {default: ts} = await import('typescript');
      const result = ts.transpileModule(bytes.toString(), {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022}});
      await mkdir(outputDirectory, {recursive: true});
      const file = path.join(outputDirectory, filename + '.mjs'); await writeFile(file, result.outputText);
      harnessInputs[file] = sha(Buffer.from(result.outputText));
      return (await import(pathToFileURL(file).href))[exported];
    };
    if (fact.offers.some(offer => offer.capability.startsWith('audio.decode.'))) {
      const Decoder = await compile('packet-decoder', 'PacketAudioDecoder');
      adapter.createDecoder = (fixture, signal) => new Decoder(module, fixture.codec, signal,
        ['ac3', 'eac3', 'dts-core', 'truehd', 'mlp', 'dts-hd'].includes(fixture.codec) ? undefined : fixture);
    }
    if (fact.offers.some(offer => offer.capability === 'audio.encode.flac')) {
      const Encoder = await compile('flac-encoder', 'PacketFlacEncoder');
      adapter.createEncoder = (configuration, signal) => new Encoder(module, configuration.channels, signal, 0, configuration.sampleRate);
    }
    if (fact.offers.some(offer => offer.capability === 'audio.encode.opus')) {
      const Encoder = await compile('opus-encoder', 'PacketOpusEncoder');
      adapter.createOpusEncoder = (configuration, signal) => new Encoder(module, configuration.channels, signal);
      if (!adapter.createWriter) {
        const {FragmentedMP4Writer} = await compileFixture('fmp4');
        adapter.fixtureWriter = tracks => new FragmentedMP4Writer(tracks);
      }
    }
  }
  return {adapter, imports, harnessInputs, stagedInputs, name: 'demuxe-component-abi-v1'};
}
