// SPDX-License-Identifier: Apache-2.0
/** Internal packet-copy mechanism. Admission and provider qualification belong to
 * the existing preparation owner; this function grants neither. */
export async function copySelectedPackets(runtime, input, {trackIds, format, signal, validatePacket, maxOutputBytes = 32 * 1024 * 1024, maxPackets = 100000, maxInputPacketBytes = 32 * 1024 * 1024}) {
  if (!Array.isArray(trackIds) || !trackIds.length || new Set(trackIds).size !== trackIds.length) throw new TypeError('An explicit unique selected-track set is required');
  for (const limit of [maxOutputBytes, maxPackets, maxInputPacketBytes]) if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError('Invalid packet-copy budget');
  const check = () => signal?.throwIfAborted();
  check();
  const all = await input.getTracks(); check();
  const selected = trackIds.map(id => {
    const track = all.find(candidate => candidate.id === id);
    if (!track) throw new Error('A requested track is unavailable');
    if (!['video', 'audio'].includes(track.type) || !track.codec) throw new Error('Selected track cannot be copied');
    return track;
  });
  // Fixed-size pages keep random-access mux writes bounded without reserving the
  // entire output limit or retaining a history of overwritten writes.
  const pageSize = 65536, pages = new Map();
  let outputSize = 0, packetCount = 0, inputPacketBytes = 0, writtenBytes = 0;
  const target = new runtime.StreamTarget(new WritableStream({write({data, position}) {
    check();
    if (!(data instanceof Uint8Array) || !Number.isSafeInteger(position) || position < 0 || data.length > maxOutputBytes - position || data.length > maxOutputBytes * 8 - writtenBytes) throw new RangeError('Packet-copy output budget exceeded');
    writtenBytes += data.length;
    outputSize = Math.max(outputSize, position + data.length);
    for (let offset = 0; offset < data.length;) {
      const at = position + offset, index = Math.floor(at / pageSize), within = at % pageSize;
      const length = Math.min(data.length - offset, pageSize - within);
      let page = pages.get(index);
      if (!page) { page = new Uint8Array(Math.min(pageSize, maxOutputBytes - index * pageSize)); pages.set(index, page); }
      page.set(data.subarray(offset, offset + length), within); offset += length;
    }
  }}), {chunked: false});
  const output = new runtime.Output({format, target});
  let complete = false, cancellation, failure;
  const cancel = () => { cancellation ??= Promise.resolve().then(() => output.cancel()); void cancellation.catch(() => {}); };
  signal?.addEventListener('abort', cancel, {once: true});
  try {
    check();
    const tracks = [];
    for (const track of selected) {
      const config = await track.getDecoderConfig(); check();
      if (!config) throw new Error('Selected track has no decoder configuration');
      const source = track.type === 'video' ? new runtime.EncodedVideoPacketSource(track.codec) : new runtime.EncodedAudioPacketSource(track.codec);
      const name = await track.getName();
      const metadata = {...(name === null ? {} : {name}), languageCode: await track.getLanguageCode()};
      if (track.type === 'video') output.addVideoTrack(source, {...metadata, rotation: await track.getRotation()});
      else output.addAudioTrack(source, metadata);
      tracks.push({track, source, config, packets: 0});
    }
    check(); await output.start(); check();
    // Drain tracks concurrently: muxer backpressure can require another track's
    // next packet. Awaiting one complete track first can deadlock interleaving.
    let pumpFailure;
    const results = await Promise.allSettled(tracks.map(async entry => {
      const iterator = new runtime.EncodedPacketSink(entry.track).packets();
      try {
        for await (const packet of iterator) {
          check();
          validatePacket?.(packet, entry.track);
          const size = packet.data.byteLength + (packet.sideData.alpha?.byteLength ?? 0);
          if (++packetCount > maxPackets || size > maxInputPacketBytes - inputPacketBytes) throw new RangeError('Packet-copy input budget exceeded');
          inputPacketBytes += size;
          await entry.source.add(packet, entry.packets++ === 0 ? {decoderConfig: entry.config} : undefined);
          check();
        }
        if (!entry.packets) throw new Error('A selected track has no packets');
        entry.source.close();
      } catch (error) { pumpFailure ??= error; cancel(); throw error; }
    }));
    const rejected = results.find(result => result.status === 'rejected');
    if (rejected) throw pumpFailure ?? rejected.reason;
    await output.finalize(); check(); complete = true;
    const chunks = [];
    for (let at = 0; at < outputSize; at += pageSize) {
      const length = Math.min(pageSize, outputSize - at);
      chunks.push((pages.get(at / pageSize) ?? new Uint8Array(length)).slice(0, length));
    }
    return {file: new Blob(chunks, {type: format.mimeType}), trackIds: Object.freeze([...trackIds]), packetCount, inputPacketBytes, outputBytes: outputSize};
  } catch (error) { failure = error; throw error; }
  finally {
    signal?.removeEventListener('abort', cancel);
    if (!complete) { cancel(); await cancellation.catch(error => { if (!failure) throw error; }); }
    pages.clear();
  }
}
