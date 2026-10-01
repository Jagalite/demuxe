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
    if(options.fixtureRoot){const file=path.join(options.fixtureRoot,filename+'.js');Object.assign(harnessInputs,await collectHarnessInputs(file));return import(pathToFileURL(file).href);}
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
  for(const [name,filename,exported] of [['openIsoBmff','isobmff','IsoBmffReader'],['openOgg','ogg','OggAudioReader'],['openWaveAiff','wave-aiff','WaveAiffReader'],['openMpegTs','mpegts','MpegTsReader'],['openApe','ape','ApeReader'],['openWavpack','wavpack','WavPackReader'],['openTta','tta','TtaReader'],['openTak','tak','TakReader'],['openShorten','shorten','ShortenReader'],['openAdpcmWave','adpcm-wave','AdpcmWaveReader'],['openTelephony','telephony','TelephonyReader']]){
    const candidate=find('/provider-container/src/'+filename+'.js');
    if(candidate){const module=await importArtifact(candidate);adapter[name]=(blob,signal,configuration)=>module[exported].open(blob,signal,configuration);}
  }
  if(readerPath){const {MatroskaReader}=await importArtifact(readerPath);adapter.openWebm=(blob,signal)=>MatroskaReader.open(blob,signal);}
  const g726Reader=find('/provider-container/src/g726.js');
  if(g726Reader){const {G726Reader}=await importArtifact(g726Reader);adapter.openG726=(blob,signal)=>G726Reader.openWave(blob,signal);adapter.openRawG726=(blob,signal,configuration)=>G726Reader.openRaw(blob,configuration,signal);}
  const webmRemux=find('/provider-container/src/webm-remux.js');
  if(webmRemux){const {remuxWebm}=await importArtifact(webmRemux);adapter.remuxWebm=(blob,signal)=>remuxWebm(blob,signal);}
  const webmWriter=find('/provider-container/src/webm.js');
  if(webmWriter){const {WebmPacketWriter}=await importArtifact(webmWriter);adapter.createWebmWriter=(...args)=>new WebmPacketWriter(...args);}
  const factoryPath = options.factory ?? find('/module.mjs');
  const wasmPath = options.wasm ?? (factoryPath && factoryPath.slice(0, -4) + '.wasm');
  if (factoryPath && allowed.has(wasmPath)) {
    const factory = (await importArtifact(factoryPath)).default;
    const wasmBinary = await readArtifact(wasmPath);
    const module = await factory({wasmBinary});
    // These are test ABI adapters, recorded separately from provider artifacts.
    // The media implementation always comes from the verified candidate package.
    const compile = async (filename, exported) => {
      if(options.wrapperRoot){const file=path.join(options.wrapperRoot,filename+'.js');Object.assign(harnessInputs,await collectHarnessInputs(file));return (await import(pathToFileURL(file).href))[exported];}
      if(filename==='packet-decoder'&&options.decoderWrapper){Object.assign(harnessInputs,await collectHarnessInputs(options.decoderWrapper));return (await import(pathToFileURL(options.decoderWrapper).href))[exported];}
      const source = path.join(repository, 'packages/provider-audio/src', filename + '.ts');
      const {build} = await import('esbuild');
      const bundled = await build({entryPoints:[source],bundle:true,write:false,format:'esm',platform:'node',metafile:true});
      for(const input of Object.keys(bundled.metafile.inputs)){const name=path.resolve(input);harnessInputs[name]=sha(await readFile(name));}
      const file = path.join(outputDirectory, filename + '.mjs'); await writeFile(file,bundled.outputFiles[0].contents);
      harnessInputs[file]=sha(bundled.outputFiles[0].contents);
      return (await import(pathToFileURL(file).href))[exported];
    };
    if (fact.offers.some(offer => offer.capability.startsWith('audio.decode.'))) {
      const Decoder = await compile('packet-decoder', 'PacketAudioDecoder');
      adapter.createDecoder = (fixture, signal) => new Decoder(module, fixture.codec, signal,
        ['ac3', 'eac3', 'dts-core'].includes(fixture.codec) ? undefined : {...fixture,...fixture.framing});
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
