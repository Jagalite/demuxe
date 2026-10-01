// SPDX-License-Identifier: Apache-2.0
// Browser-safe checks for the packet audio decoder contract used by providers.
const assert = (condition, message) => { if (!condition) throw Error(message); };
const arrays = frame => [...(frame.planes ?? []), ...(frame.planes64 ?? []), ...(frame.pcm ? [frame.pcm] : [])];
const equal = (a, b) => a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
const integerCodecs = new Set(['truehd', 'mlp', 'dts-hd', 'flac', 'alac', 'pcm-s16le', 'pcm-s24le', 'pcm-s32le','pcm-u8','pcm-s8','adpcm-ima-qt','adpcm-g726','adpcm-g726le']);

export function packetTrimMetadata(codec, extradata, packets) {
  const sides = packets.flatMap(packet => packet.side_data_list ?? []).filter(side => side.side_data_type === 'Skip Samples');
  const skip = sides.reduce((n, side) => n + Number(side.skip_samples ?? 0), 0);
  const decoderSkip = codec === 'opus' && extradata?.length >= 12
    ? new DataView(extradata.buffer, extradata.byteOffset, extradata.byteLength).getUint16(10, true)
    : codec === 'vorbis' ? skip : 0;
  return {skipSamples: Math.max(0, skip - decoderSkip), discardSamples: sides.reduce((n, side) => n + Number(side.discard_padding ?? 0), 0)};
}

/** Factories and decoder methods may be synchronous or asynchronous. References
 * are interleaved PCM; packet and frame PTS/durations use sample-rate units.
 * Optional Node parityOutput is a directory, .f32le filename, or {directory|file,
 * input}; input identifies the original fixture, never a reference PCM file. */
export async function runAudioDecoderChecks({createDecoder, fixture, packets, reference, timingReference, integerReference, doubleReference, skipSamples = 0, discardSamples = 0, parityOutput, input}) {
  assert(typeof createDecoder === 'function', 'Missing decoder factory');
  assert(Number.isSafeInteger(fixture?.sampleRate) && fixture.sampleRate > 0 && Number.isSafeInteger(fixture.channels) && fixture.channels > 0, 'Invalid fixture configuration');
  assert(Array.isArray(packets) && packets.length > 0 && packets.every(packet => packet.data instanceof Uint8Array && packet.data.length > 0 && Number.isSafeInteger(packet.pts)), 'Invalid fixture packets');
  assert(reference instanceof Float32Array && reference.length > 0 && reference.length % fixture.channels === 0 && reference.every(Number.isFinite), 'Invalid PCM reference');
  assert([skipSamples, discardSamples].every(n => Number.isSafeInteger(n) && n >= 0), 'Invalid sample trimming');
  assert(!integerReference || integerReference instanceof Int32Array, 'Invalid integer reference');
  assert(!doubleReference || doubleReference instanceof Float64Array && doubleReference.every(Number.isFinite), 'Invalid double reference');
  assert(timingReference && Array.isArray(timingReference.segments) && timingReference.segments.length > 0 && timingReference.segments.every(segment => Number.isSafeInteger(segment.pts) && Number.isSafeInteger(segment.samples) && segment.samples > 0), 'Missing or invalid native timing reference');
  assert(Number.isSafeInteger(timingReference.toleranceSamples) && timingReference.toleranceSamples >= 0, 'Invalid native timing tolerance');
  assert(timingReference.segments.reduce((sum, segment) => sum + segment.samples, 0) === reference.length / fixture.channels, 'Native timing sample count differs from PCM reference');
  const expectedLayout = fixture.layout ?? (fixture.channels === 1 ? 4 : fixture.channels === 2 ? 3 : undefined);
  // Lossless fixtures must retain the corresponding precision checks.
  assert(!integerCodecs.has(fixture.codec) || integerReference, 'Missing integer PCM reference');
  assert(fixture.codec !== 'pcm-f64le' || doubleReference, 'Missing double PCM reference');
  const controller = new AbortController();
  let decoder;
  const retained = [];
  const checkOwned = (recent = false) => {
    // Check first/current views on every call, and every retained owned view
    // at complete replay/reset/cancel/dispose boundaries. Full streams must not
    // turn buffer ownership checks into quadratic work across every packet.
    const selected=recent&&retained.length>2?[retained[0],retained[retained.length-1]]:retained;
    for (const {frame, metadata, views} of selected) {
      assert(metadata.every(([key, value]) => Object.is(frame[key], value)), 'Retained frame metadata changed');
      assert(arrays(frame).length === views.length && arrays(frame).every((view, i) => view === views[i].view), 'Retained PCM views changed');
      for (const {view, copy} of views) assert(equal(view, copy), 'Retained PCM buffer changed');
    }
  };
  const collect = batch => {
    checkOwned(true);
    assert(Array.isArray(batch), 'Decoder must return frame arrays');
    for (const frame of batch) {
      assert(frame && frame.rate === fixture.sampleRate && frame.channels === fixture.channels, 'Decoded frame configuration mismatch');
      assert(Number.isSafeInteger(frame.samples) && frame.samples > 0, 'Invalid decoded sample count');
      assert(Number.isSafeInteger(frame.pts) && Number.isSafeInteger(frame.duration) && frame.duration >= 0 && Number.isSafeInteger(frame.generation) && frame.generation >= 0, 'Invalid decoded timing');
      assert(Number.isSafeInteger(frame.layout) && frame.layout > 0, 'Invalid decoded channel layout');
      if (expectedLayout !== undefined) assert(frame.layout === expectedLayout, 'Decoded channel layout differs from fixture');
      if (frame.pcm) assert(frame.pcm instanceof Int32Array && frame.pcm.length === frame.samples * fixture.channels, 'Invalid integer PCM shape');
      else assert(frame.planes?.length === fixture.channels && frame.planes.every(plane => plane instanceof Float32Array && plane.length === frame.samples), 'Invalid PCM plane shape');
      if (frame.planes64) assert(frame.planes64.length === fixture.channels && frame.planes64.every(plane => plane instanceof Float64Array && plane.length === frame.samples), 'Invalid double PCM shape');
      assert(arrays(frame).every(view => view.every(Number.isFinite)), 'Nonfinite decoded PCM');
      retained.push({frame, metadata: ['rate', 'channels', 'layout', 'samples', 'pts', 'duration', 'generation'].map(key => [key, frame[key]]), views: arrays(frame).map(view => ({view, copy: view.slice()}))});
    }
    return batch;
  };
  const decodeAll = async (owner, timestampOffset = 0) => {
    const frames = [];
    for (const packet of packets) {
      const input = packet.data.slice();
      frames.push(...collect(await owner.decode(input, packet.pts + timestampOffset)));
      assert(equal(input, packet.data), 'Decoder modified packet input');
    }
    frames.push(...collect(await owner.flush()));
    assert(collect(await owner.flush()).length === 0, 'Repeated flush emitted PCM');
    checkOwned();
    assert(frames.length > 0, 'Decoder emitted no PCM');
    for (let i = 1; i < frames.length; i++) assert(frames[i].generation === frames[0].generation && frames[i].pts >= frames[i - 1].pts, 'Decoded timing moved backwards');
    return frames;
  };
  const flatten = (frames, kind) => {
    const values = [];
    for (const frame of frames) {
      if (kind === 'integer') { assert(frame.pcm, 'Missing owned integer PCM'); for (const sample of frame.pcm) values.push(sample); }
      else for (let i = 0; i < frame.samples * fixture.channels; i++) {
        if (kind === 'double') { assert(frame.planes64, 'Missing original double PCM'); values.push(frame.planes64[i % fixture.channels][Math.floor(i / fixture.channels)]); }
        else values.push(frame.pcm ? frame.pcm[i] / 2147483648 : frame.planes[i % fixture.channels][Math.floor(i / fixture.channels)]);
      }
    }
    return kind === 'integer' ? Int32Array.from(values) : kind === 'double' ? Float64Array.from(values) : Float32Array.from(values);
  };
  const trim = values => values.slice(skipSamples * fixture.channels, values.length - discardSamples * fixture.channels);
  const trimmedTiming = frames => {
    const rawSamples = frames.reduce((sum, frame) => sum + frame.samples, 0), end = rawSamples - discardSamples;
    const actual = []; let position = 0;
    for (const frame of frames) {
      const start = Math.max(position, skipSamples), stop = Math.min(position + frame.samples, end);
      if (stop > start) actual.push({pts: frame.pts + start - position, samples: stop - start});
      position += frame.samples;
    }
    return {segments: actual, toleranceSamples: timingReference.toleranceSamples};
  };
  const checkAbsoluteTiming = (frames, timestampOffset = 0) => {
    const actual = trimmedTiming(frames).segments;
    let a = 0, b = 0, actualOffset = 0, referenceOffset = 0;
    while (a < actual.length && b < timingReference.segments.length) {
      const expected = timingReference.segments[b];
      const difference = actual[a].pts + actualOffset - expected.pts - referenceOffset - timestampOffset;
      assert(Math.abs(difference) <= timingReference.toleranceSamples, 'Absolute decoded PTS differs from native reference by ' + difference + ' samples');
      const samples = Math.min(actual[a].samples - actualOffset, expected.samples - referenceOffset);
      actualOffset += samples; referenceOffset += samples;
      if (actualOffset === actual[a].samples) { a++; actualOffset = 0; }
      if (referenceOffset === expected.samples) { b++; referenceOffset = 0; }
    }
    assert(a === actual.length && b === timingReference.segments.length, 'Absolute decoded timeline sample count mismatch');
  };
  const rejects = async (operation, label) => {
    let rejected = false;
    try { await operation(); } catch { rejected = true; }
    assert(rejected, label);
  };
  try {
    decoder = await createDecoder(fixture, controller.signal);
    for (const method of ['decode', 'flush', 'reset', 'dispose']) assert(typeof decoder?.[method] === 'function', 'Missing decoder method ' + method);
    const frames = await decodeAll(decoder), pcm = flatten(frames, 'float'), actual = trim(pcm);
    assert(actual.length === reference.length, 'Packet sample count ' + actual.length + '/' + reference.length);
    checkAbsoluteTiming(frames);
    const predictive=['adpcm-ima-qt','adpcm-g726','adpcm-g726le'].includes(fixture.codec);
    if(predictive){
      assert(fixture.seekContract==='restart-from-start-and-discard','Missing predictive restart contract');
      assert(frames.length===packets.length&&frames.every((frame,i)=>frame.pts===packets[i].pts&&frame.samples===(fixture.codec==='adpcm-ima-qt'?64:packets[i].data.length*8/fixture.bitsPerSample)&&(frame.duration===0||frame.duration===frame.samples)),'Original predictive packet clock mismatch');
      for(const target of [1,Math.floor(reference.length/fixture.channels/2),reference.length/fixture.channels-1]){
        await decoder.reset();const replay=await decodeAll(decoder);
        assert(equal(trim(flatten(replay,'integer')).slice(target*fixture.channels),integerReference.slice(target*fixture.channels)),'Restart/discard seek integer mismatch');
      }
    }

    let maxError = 0;
    for (let i = 0; i < actual.length; i++) maxError = Math.max(maxError, Math.abs(actual[i] - reference[i]));
    assert(Number.isFinite(maxError) && maxError < 2e-5, 'Packet PCM error ' + maxError);
    if (integerReference) assert(equal(trim(flatten(frames, 'integer')), integerReference), 'Exact integer PCM mismatch');
    if (doubleReference) assert(equal(trim(flatten(frames, 'double')), doubleReference), 'Exact double PCM mismatch');
    await decoder.reset(); checkOwned();
    const repeated = await decodeAll(decoder);
    checkAbsoluteTiming(repeated);
    assert(equal(flatten(repeated, 'float'), pcm), 'Reset PCM mismatch');
    if (integerReference) assert(equal(trim(flatten(repeated, 'integer')), integerReference), 'Reset integer PCM mismatch');
    if (doubleReference) assert(equal(trim(flatten(repeated, 'double')), doubleReference), 'Reset double PCM mismatch');
    assert(repeated.length === frames.length && repeated.every((frame, i) => frame.pts === frames[i].pts && frame.duration === frames[i].duration && frame.layout === frames[i].layout && frame.generation > frames[i].generation), 'Reset timing or generation mismatch');
    await decoder.reset(); checkOwned();
    const timestampOffset = 123456, shifted = await decodeAll(decoder, timestampOffset);
    checkAbsoluteTiming(shifted, timestampOffset);
    assert(equal(flatten(shifted, 'float'), pcm), 'Shifted replay PCM mismatch');
    if (integerReference) assert(equal(trim(flatten(shifted, 'integer')), integerReference), 'Shifted integer PCM mismatch');
    if (doubleReference) assert(equal(trim(flatten(shifted, 'double')), doubleReference), 'Shifted double PCM mismatch');
    assert(shifted.length === frames.length && shifted.every((frame, i) => frame.pts === frames[i].pts + timestampOffset && frame.duration === frames[i].duration && frame.layout === frames[i].layout && frame.generation > repeated[i].generation), 'Shifted packet timestamps were not preserved');
    await rejects(() => decoder.decode(packets[0].data.slice(), packets[0].pts), 'Decode after drain was accepted');
    await decoder.dispose(); await decoder.dispose(); checkOwned();
    for (const method of ['decode', 'flush', 'reset']) await rejects(() => method === 'decode' ? decoder.decode(packets[0].data.slice(), packets[0].pts) : decoder[method](), 'Disposed decoder accepted ' + method);
    const aborted = new AbortController(); aborted.abort();
    let unexpected;
    try { await rejects(async () => { unexpected = await createDecoder(fixture, aborted.signal); }, 'Pre-aborted decoder was accepted'); }
    finally { await unexpected?.dispose(); }
    const cancel = new AbortController();
    const canceledDecoder = await createDecoder(fixture, cancel.signal);
    try {
      collect(await canceledDecoder.decode(packets[0].data.slice(), packets[0].pts));
      cancel.abort(); checkOwned();
      for (const method of ['decode', 'flush', 'reset']) await rejects(() => method === 'decode' ? canceledDecoder.decode(packets[0].data.slice(), packets[0].pts) : canceledDecoder[method](), 'Aborted decoder accepted ' + method);
    } finally { cancel.abort(); await canceledDecoder.dispose(); checkOwned(); }
    if(predictive){
      for(const configuration of [{sampleRate:16000},{channels:3},{bitsPerSample:1}]){
        let unexpected;
        try{await rejects(async()=>{unexpected=await createDecoder({...fixture,...configuration},new AbortController().signal);},'Predictive invalid configuration accepted');}finally{await unexpected?.dispose();}
      }
      const invalid=await createDecoder(fixture,new AbortController().signal);
      try{
        await rejects(()=>invalid.decode(packets[0].data.slice(),Number.MAX_SAFE_INTEGER),'Predictive unsafe end clock accepted');
        if(fixture.codec==='adpcm-ima-qt'||[3,5].includes(fixture.bitsPerSample))await rejects(()=>invalid.decode(Uint8Array.of(0),0),'Predictive incomplete coded group accepted');
      }finally{await invalid.dispose();}
    }
    const result = {samples: actual.length / fixture.channels, maxError, integerExact: Boolean(integerReference), doubleExact: Boolean(doubleReference), reset: true, ownership: true, cancellation: true, lifecycle: true, timing: true, timingToleranceSamples: timingReference.toleranceSamples, ...(predictive?{restartDiscard:true,originalPacketClock:true}: {})};
    if (parityOutput) {
      // Node-only artifact delivery is opt-in; the same checks run in browsers.
      const [{mkdir, writeFile}, {default: path}] = await Promise.all([import('node:fs/promises'), import('node:path')]);
      const options = typeof parityOutput === 'string' ? (/\.f32le$/.test(parityOutput) ? {file: parityOutput} : {directory: parityOutput}) : parityOutput;
      const sourceInput = options.input ?? input ?? fixture.input;
      assert(path.isAbsolute(sourceInput ?? ''), 'Parity source input must be absolute');
      const candidatePCM = path.resolve(options.file ?? path.join(options.directory, 'candidate.f32le'));
      await mkdir(path.dirname(candidatePCM), {recursive: true});
      // Explicit little-endian serialization of owned snapshots, never provider views.
      const bytes = new Uint8Array(actual.length * 4), view = new DataView(bytes.buffer);
      for (let i = 0; i < actual.length; i++) view.setFloat32(i * 4, actual[i], true);
      const timing = trimmedTiming(frames), candidateTiming = candidatePCM + '.timing.json';
      const sourceTiming = candidatePCM + '.source-timing.json';
      await writeFile(candidatePCM, bytes);
      await writeFile(candidateTiming, JSON.stringify(timing, null, 2) + '\n');
      await writeFile(sourceTiming, JSON.stringify(timingReference, null, 2) + '\n');
      const rawPrecision = fixture.codec === 'pcm-f64le' || fixture.codec === 'pcm-s32le' || fixture.bitsPerSample > 24;
      result.parityJobs = [{kind: 'audio-decoder', input: sourceInput, candidatePCM, candidateTiming, sourceTiming,
        sampleRate: fixture.sampleRate, channels: fixture.channels, codec: fixture.codec, bitsPerSample: fixture.bitsPerSample,
        profile: 'flac24', timing,
        scope: 'Supplementary decoded PCM comparison through the packaged FFmpeg FLAC24 preparation profile',
        ...(rawPrecision ? {rawPrecisionParity: {status: 'blocked', reason: 'Packaged FFmpeg exposes FLAC24 preparation, not exact original PCM above 24-bit precision'}} : {})}];
    }
    return result;
  } finally { await decoder?.dispose(); controller.abort(); }
}
