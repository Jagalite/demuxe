importScripts('/web/adapt/vendor/libav-6.10.9.0-webcodecs.js');
let av, ic, oc, pb, streams, vs, as, dec, enc, ap, readpkt, muxpkt, gen, dead = false, chain = Promise.resolve(), abort = new AbortController(), cache = new Map(), chunks = [], outPosition = 0, pendingBytes = 0, fifo = new Float32Array(1920), used = 0, nextPTS = null, eof = false;
let firstFragmentMs = 0, firstFragmentTuned = false;
let codec = 'opus', frameSamples = 960, sampleFormat, verifyDecoder, expected = [], expectedAt = 0, verifyLossless = false;
const mark = key => { if (stats.timing[key] === undefined) stats.timing[key] = performance.timeOrigin + performance.now(); };
let stats = { timing: {}, encodingWallMs: 0, losslessSamplesCompared: 0, losslessSampleMismatches: 0, videoFramesDecoded: 0, videoFramesEncoded: 0, videoPacketsCopied: 0, videoBytesCopied: 0, videoDTSReconstructed: 0, videoPayloadComparisons: 0, videoPayloadMismatches: 0, fragments: 0, conversionWallMs: 0, peakOutstandingFetches: 0, outstandingFetches: 0, audioFramesDecoded: 0, audioSamplesDecoded: 0, audioSamplesEncoded: 0, audioPacketBytes: 0, audioPacketsEncoded: 0, sourceBytesRead: 0, metadataBytesRead: 0, rangeRequests: 0, outputBytes: 0, outputChunks: 0, sourceMinPTS: null, sourceMaxPTS: 0, audioFirstPTS: null, audioMaxPTS: 0, encoderFirstPacketPTS: null, encoderLastPacketEnd: null, peakInputCacheBytes: 0, peakWorkerOutputBytes: 0, steps: 0, eof: false };
const hash = b => { let h = 2166136261; for (const x of b)
    h = Math.imul(h ^ x, 16777619); return h >>> 0; };
const check = (r, label) => { if (r < 0)
    throw Error(label + ': ' + r); return r; };
const seconds = p => av.i64tof64(p.pts, p.ptshi || 0) * (p.time_base_num || 1) / (p.time_base_den || 1000);
function stamp(p) { let t = seconds(p); stats.sourceMinPTS = stats.sourceMinPTS === null ? t : Math.min(stats.sourceMinPTS, t); stats.sourceMaxPTS = Math.max(stats.sourceMaxPTS, t + (p.duration || 0) * (p.time_base_num || 1) / (p.time_base_den || 1000)); }
async function writePackets(packets) { for (const p of packets) {
    if (dead)
        throw Error('retired');
    await av.ff_copyin_packet(muxpkt, p);
    if (p.stream_index === 0) {
        const copy = await av.ff_copyout_packet(muxpkt);
        stats.videoPayloadComparisons++;
        if (hash(copy.data) !== hash(p.data) || copy.data.length !== p.data.length) {
            stats.videoPayloadMismatches++;
            throw Error('video payload changed');
        }
    }
    const st = await av.AVFormatContext_streams_a(oc, p.stream_index);
    const n = await av.AVStream_time_base_num(st), d = await av.AVStream_time_base_den(st);
    await av.av_packet_rescale_ts_js(muxpkt, p.time_base_num, p.time_base_den, n, d);
    check(await av.av_interleaved_write_frame(oc, muxpkt), 'mux packet');
    await av.av_packet_unref(muxpkt);
} }
// Pilot-only roundtrip validation. Disabled during all CPU/conversion measurements.
async function verifyPackets(pkts, fin = false) {
    if (!verifyDecoder) return;
    const decoded = await av.ff_decode_multi(verifyDecoder[1], verifyDecoder[2], verifyDecoder[3], pkts, fin);
    for (const f of decoded) {
        if (f.sample_rate !== 48000 || f.channels !== 2) throw Error('FLAC sample configuration changed');
        for (let i = 0; i < f.nb_samples; i++) for (let ch = 0; ch < 2; ch++) {
            const actual = f.format === av.AV_SAMPLE_FMT_S32 ? f.data[i * 2 + ch] : f.format === av.AV_SAMPLE_FMT_S32P ? f.data[ch][i] : NaN;
            if (!expected.length || actual !== expected[0][expectedAt]) { stats.losslessSampleMismatches++; throw Error('FLAC PCM roundtrip mismatch'); }
            stats.losslessSamplesCompared++; expectedAt++;
            if (expectedAt === expected[0].length) { expected.shift(); expectedAt = 0; }
        }
    }
    if (fin && expected.length) throw Error('FLAC missing decoded tail');
}
async function encode(frames, fin = false) { if (verifyDecoder) for (const f of frames) expected.push(f.data.slice()); const began = performance.now(); const pkts = await av.ff_encode_multi(enc[1], enc[2], enc[3], frames, fin); stats.encodingWallMs += performance.now() - began;
if (pkts.length) mark('firstEncodedAudio');
await verifyPackets(pkts, fin); for (const p of pkts) {
    p.stream_index = 1;
    stats.audioPacketsEncoded++; stats.audioPacketBytes += p.data.length;
    const t = seconds(p);
    if (stats.encoderFirstPacketPTS === null)
        stats.encoderFirstPacketPTS = t;
    stats.encoderLastPacketEnd = t + (p.duration || 0) / 48000;
} await writePackets(pkts); }
async function audioPackets(packets, fin = false) { const frames = await av.ff_decode_multi(dec[1], dec[2], dec[3], packets, fin); const out = []; if (frames.length) mark('firstDecodedPCM'); for (const f of frames) {
    if (f.sample_rate !== 48000 || f.channels !== 2 || f.format !== av.AV_SAMPLE_FMT_S32 || !(f.data instanceof Int32Array))
        throw Error('Only decoded packed s32 stereo 48k is qualified: ' + JSON.stringify({ rate: f.sample_rate, channels: f.channels, format: f.format, data: f.data?.constructor?.name }));
    const t = av.i64tof64(f.pts, f.ptshi || 0) * f.time_base_num / f.time_base_den;
    if (nextPTS === null) {
        nextPTS = Math.round(t * 48000);
        stats.audioFirstPTS = t;
    }
    stats.audioFramesDecoded++;
    stats.audioSamplesDecoded += f.nb_samples;
    stats.audioMaxPTS = Math.max(stats.audioMaxPTS, t + f.nb_samples / 48000);
    let at = 0;
    while (at < f.data.length) {
        const count = Math.min(fifo.length - used, f.data.length - at);
        for (let i = 0; i < count; i++)
            // Keep the 24-bit source samples in their exact packed s32 representation for FLAC.
            fifo[used + i] = codec === 'flac' ? f.data[at + i] : f.data[at + i] / 2147483648;
        used += count;
        at += count;
        if (used === fifo.length) {
            const [pts, ptshi] = av.f64toi64(nextPTS);
            out.push({ data: fifo, format: sampleFormat, channel_layout: 3, channels: 2, sample_rate: 48000, nb_samples: frameSamples, pts, ptshi, time_base_num: 1, time_base_den: 48000 });
            nextPTS += frameSamples;
            stats.audioSamplesEncoded += frameSamples;
            fifo = codec === 'flac' ? new Int32Array(frameSamples * 2) : new Float32Array(frameSamples * 2);
            used = 0;
        }
    }
} await encode(out, false); if (fin) {
    if (used) {
        const n = used / 2, [pts, ptshi] = av.f64toi64(nextPTS);
        await encode([{ data: fifo.slice(0, used), format: sampleFormat, channel_layout: 3, channels: 2, sample_rate: 48000, nb_samples: n, pts, ptshi, time_base_num: 1, time_base_den: 48000 }], false);
        stats.audioSamplesEncoded += n;
        used = 0;
    }
    await encode([], true);
} }
async function init(m) {
    gen = m.gen; firstFragmentMs = m.firstFragmentMs || 0; stats.firstFragmentTargetMs = firstFragmentMs; codec = m.codec || 'opus'; verifyLossless = !!m.verifyLossless; mark('workerInit');
    av = await LibAV.LibAV({ noworker: true, nothreads: true, base: new URL("/web/adapt/vendor", self.location.href).href, wasmurl: new URL("/web/adapt/vendor/libav-6.10.9.0-webcodecs.wasm.wasm", self.location.href).href });
    const h = await fetch(m.url, { method: 'HEAD', signal: abort.signal });
    if (!h.ok)
        throw Error('HEAD ' + h.status);
    const size = Number(h.headers.get('Content-Length'));
    if (!Number.isSafeInteger(size) || size <= 0)
        throw Error('source size');
    stats.sourceSize = size; mark('sourceOpened');
    const chunkSize = 262144;
    av.onblockread = async (name, pos, length) => { if (dead)
        throw Error('retired'); let key = Math.floor(pos / chunkSize) * chunkSize, data = cache.get(key); if (!data) {
        const end = Math.min(size, key + Math.max(chunkSize, length)) - 1;
        stats.outstandingFetches++;
        stats.peakOutstandingFetches = Math.max(stats.peakOutstandingFetches, stats.outstandingFetches);
        const r = await fetch(m.url, { headers: { Range: `bytes=${key}-${end}` }, signal: abort.signal });
        if (r.status !== 206 || r.headers.get('Content-Range') !== `bytes ${key}-${end}/${size}`)
            throw Error('invalid range response');
        data = new Uint8Array(await r.arrayBuffer());
        stats.outstandingFetches--;
        if (data.length !== end - key + 1)
            throw Error('short range');
        if (dead)
            throw Error('retired');
        stats.sourceBytesRead += data.length;
        stats.rangeRequests++;
        cache.set(key, data);
        while (cache.size > 4)
            cache.delete(cache.keys().next().value);
        stats.peakInputCacheBytes = Math.max(stats.peakInputCacheBytes, [...cache.values()].reduce((n, b) => n + b.length, 0));
    } await av.ff_block_reader_dev_send(name, key, data); };
    await av.mkblockreaderdev('input', size);
    [ic, streams] = await av.ff_init_demuxer_file('input');
    stats.metadataBytesRead = stats.sourceBytesRead;
    vs = streams.find(s => s.codec_type === 0);
    as = streams.find(s => s.codec_type === 1);
    if (!vs || !as)
        throw Error('AV streams required');
    stats.videoCodec = await av.avcodec_get_name(vs.codec_id);
    stats.inputAudioCodec = await av.avcodec_get_name(as.codec_id);
    stats.videoDecoderAvailable = !!await av.avcodec_find_decoder(vs.codec_id);
    stats.videoEncoderAvailable = !!await av.avcodec_find_encoder(vs.codec_id);
    if (stats.videoCodec !== 'h264' || stats.inputAudioCodec !== 'pcm_s24le')
        throw Error('fixture contract');
    mark('demuxReady'); stats.selectedStreams = { video: vs, audio: as };
    stats.inputAudioParameters = await av.ff_copyout_codecpar(as.codecpar);
    stats.videoParameters = await av.ff_copyout_codecpar(vs.codecpar);
    if (m.target > 0) {
        const anchor = Math.max(0, Math.floor(m.target / 2) * 2 - 2);
        check(await av.av_seek_frame(ic, vs.index, ...av.f64toi64(Math.round(anchor * vs.time_base_den / vs.time_base_num)), 1), 'seek');
        stats.seekAnchorRequested = anchor;
    }
    dec = await av.ff_init_decoder(as.codec_id, { codecpar: as.codecpar, time_base: [as.time_base_num, as.time_base_den] });
    sampleFormat = codec === 'flac' ? av.AV_SAMPLE_FMT_S32 : av.AV_SAMPLE_FMT_FLT;
    enc = await av.ff_init_encoder(codec === 'flac' ? 'flac' : 'libopus', { ctx: { sample_rate: 48000, sample_fmt: sampleFormat, channel_layout: 3, channels: 2, ...(codec === 'flac' ? {} : {bit_rate:160000}) }, time_base: [1,48000], options: codec === 'flac' ? {flags:'+global_header',compression_level:'5',bits_per_raw_sample:'24'} : {application:'audio',frame_duration:'20',flags:'+global_header'} });
    frameSamples = enc[4];
    if (!(frameSamples > 0)) throw Error('encoder frame size');
    fifo = codec === 'flac' ? new Int32Array(frameSamples * 2) : new Float32Array(frameSamples * 2);
    stats.outputAudio = {codec, encoder:codec === 'flac' ? 'flac' : 'libopus', bitrate:codec === 'flac' ? null : 160000, channels:2,sampleRate:48000,frameSamples, bitsPerRawSample:codec === 'flac' ? 24 : null, verificationEnabled:verifyLossless};
    ap = await av.avcodec_parameters_alloc();
    check(await av.avcodec_parameters_from_context(ap, enc[1]), 'audio parameters');
    stats.outputAudioParameters = await av.ff_copyout_codecpar(ap);
    if (codec === 'flac' && verifyLossless) verifyDecoder = await av.ff_init_decoder('flac',{codecpar:ap,time_base:[1,48000]});
    av.onwrite = (name, pos, data) => { if (pos !== outPosition)
        throw Error('non-progressive output write'); outPosition += data.length; const c = data.slice(); chunks.push(c); pendingBytes += c.length; stats.peakWorkerOutputBytes = Math.max(stats.peakWorkerOutputBytes, pendingBytes); if (pendingBytes > 8 * 1024 * 1024)
        throw Error('worker output cap'); stats.outputBytes += c.length; };
    await av.mkstreamwriterdev('output.mp4');
    [oc, , pb] = await av.ff_init_muxer({ format_name: 'mp4', filename: 'output.mp4', open: true, codecpars: true }, [[vs.codecpar, vs.time_base_num, vs.time_base_den], [ap, 1, 48000]]);
    check(await av.av_opt_set(oc, 'movflags', 'frag_keyframe+delay_moov+default_base_moof+skip_trailer', 1), 'movflags');
    if (firstFragmentMs) check(await av.av_opt_set(oc, 'frag_duration', String(firstFragmentMs * 1000), 1), 'first fragment duration');
    check(await av.av_opt_set(oc, 'strict', '-2', 1), 'strict');
    check(await av.avformat_write_header(oc, 0), 'header');
    readpkt = await av.av_packet_alloc();
    muxpkt = await av.av_packet_alloc();
    return emit();
}
function emit() { const bytes = new Uint8Array(pendingBytes); let at = 0; for (const c of chunks) {
    bytes.set(c, at);
    at += c.length;
} chunks = []; pendingBytes = 0; if (bytes.length) {
    stats.outputChunks++;
    for (let at = 0; at + 8 <= bytes.length;) {
        const size = new DataView(bytes.buffer).getUint32(at);
        if (size < 8 || at + size > bytes.length)
            break;
        const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
        if (type === 'moov') mark('initializationReady');
        if (type === 'moof') stats.fragments++;
        if (type === 'mdat' && stats.fragments) mark('firstPlayableFragment');
        at += size;
    }
} return { bytes, stats: { ...stats }, eof }; }
async function step() { if (eof)
    return emit(); stats.steps++; const start = performance.now(); const [ret, groups] = await av.ff_read_frame_multi(ic, readpkt, { limit: 65536, unify: true }); for (const p of groups[0] || []) {
    if (dead)
        throw Error('retired');
    stamp(p);
    if (p.stream_index === vs.index) {
        if (p.ptshi === -2147483648)
            throw Error('missing video PTS');
        if (p.dtshi === -2147483648) {
            p.dts = p.pts;
            p.dtshi = p.ptshi;
            stats.videoDTSReconstructed++;
        }
        stats.videoPacketsCopied++;
        stats.videoBytesCopied += p.data.length;
        const before = p.data;
        p.stream_index = 0;
        await writePackets([p]);
        if (p.data !== before)
            throw Error('video payload replaced');
    }
    else if (p.stream_index === as.index) { mark('firstInputAudioPacket'); await audioPackets([p]); }
} if (ret === -541478725) {
    await audioPackets([], true);
    check(await av.av_write_trailer(oc), 'trailer');
    eof = stats.eof = true;
}
else if (ret !== -6 && ret < 0)
    throw Error('demux ' + ret); await av.avio_flush(pb); stats.conversionWallMs += performance.now() - start; const emitted = emit(); if(firstFragmentMs&&!firstFragmentTuned&&stats.fragments>0){check(await av.av_opt_set(oc,'frag_duration','0',1),'restore keyframe fragments');firstFragmentTuned=true;stats.firstFragmentOverrideRestored=true;} return emitted; }
async function cleanup() { dead = true; abort.abort(); stats.abortedRangeRequests = stats.outstandingFetches; stats.outstandingFetches = 0; cache.clear(); chunks = []; pendingBytes = 0; if (av) {
    if (dec)
        await av.ff_free_decoder(dec[1], dec[2], dec[3]);
    if (verifyDecoder) await av.ff_free_decoder(verifyDecoder[1],verifyDecoder[2],verifyDecoder[3]);
    if (enc)
        await av.ff_free_encoder(enc[1], enc[2], enc[3]);
    if (oc)
        await av.ff_free_muxer(oc, pb);
    if (ic)
        await av.avformat_close_input_js(ic);
    if (ap)
        await av.avcodec_parameters_free_js(ap);
    if (readpkt)
        await av.av_packet_free_js(readpkt);
    if (muxpkt)
        await av.av_packet_free_js(muxpkt);
    av.terminate();
} return { stats, contextsReleased: true, queueBytes: 0 }; }
// Test-only worker failure barriers, never sent by playback.
onmessage = ({ data: m }) => { if(m.type === 'risk-hold') return; if(m.type === 'risk-crash'){setTimeout(()=>{throw Error('risk injected worker failure')},0);return;} if (m.type === 'destroy') {
    dead = true;
    abort.abort();
} chain = chain.catch(() => { }).then(async () => { try {
    const r = m.type === 'init' ? await init(m) : m.type === 'step' ? await step() : await cleanup();
    postMessage({ id: m.id, gen, ...r }, r.bytes ? [r.bytes.buffer] : []);
}
catch (e) {
    postMessage({ id: m.id, gen, error: String(e.stack || e), stats });
} }); };
