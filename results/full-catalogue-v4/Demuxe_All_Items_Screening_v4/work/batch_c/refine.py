import pathlib,json,hashlib,re,importlib.util
p=pathlib.Path('results/full-catalogue-v4/Demuxe_All_Items_Screening_v4');f=p/'work/batch_c/decisions.json';a=json.loads(f.read_text())
contracts=[
('One VP9 SourceBuffer changes WebM to MP4 bytestream with continuing ordered pictures, audio if requested, and unchanged timeline; replacement/cancel cannot publish old epochs.','Correct second-epoch playback and transition interruption, not MIME acceptance.'),
('Same fMP4 coded samples, timestamps and requested tracks, authorized remote identity, cold metadata plus exact target seek.','Total transferred bytes through metadata and one target seek, including cold index acquisition.'),
('Same native packet-copy tracks/configuration/PTS/DTS and playable random-access dependencies under current 0.5-second fragmentation.','First complete playable bytes and first-frame latency, accounting for append frequency.'),
('Cue-less WebM seek reaches the requested frame and all requested tracks without claiming sparse access from functional seek alone.','All response-body bytes from cold load through target frame.'),
('Supported ASS fade/clip subset matches libass glyph masks, blend ordering and rounding with identical fonts/layout at seeks.','Total animation rendering work and retained mask bytes.'),
('Paused displayed frame remains correct and resumed audio/video can recover exact timing after current-region eviction.','Reclaimable compressed bytes including any required reappend work; not decoded-surface memory.'),
('Stable fMP4 specialization preserves packet bytes, configuration, counts, offsets and PTS/DTS and rejects changed layouts.','Actual mux construction time plus patch validation and byte assembly cost.'),
('Original source frames and source speed under one master clock; presentation opportunity may schedule but not interpolate or silently drop required output.','Presented frame identity/cadence and lateness relative to engine-selected deadline.'),
('Separate timing slope from latency offset without changed sample count, competing controllers or unstable A/V correction.','Estimator classification and bounded A/V timing error under step versus slope disturbance.'),
('A playable region requires all authorized hash-verified init/media dependency pieces; corruption or canceled ownership never publishes.','Delivery ticks or bytes until verified decodable prefix, including verification work.'),
('Canonical mux ordering includes requested sparse metadata; future-DTS proof is valid only for source/timeline epoch.','Dense packets safely emitted before next sparse event without timeout speculation.'),
('Cross-file reusable closed group is immutable and keyed by authorized coded data, codec config, color and closure; file timestamps remain outside cache.','Net reused decode/preparation work after hashing, lookup and retained cache bytes.'),
('Whole-frame comparison witness must exactly match independent CPU count, max error and first mismatch on identical textures.','Observer work plus readback bytes on the actual graphics backend.'),
('Direct existing-stride GL upload yields identical visible pixels and color with legal offsets, per-plane widths, and reset pixel-store state.','Eliminated planeCopyBytes plus actual total upload/draw cost.'),
('Multipart fetch recovers exactly requested disjoint ranges with strong source identity, bounded parser and canceled consumers.','Total response-body bytes and completed request latency including MIME overhead.'),
('33-bit TS rollover normalization retains original A/V offset and reordering; ambiguous epoch or unmarked discontinuity rejects.','Correct scoped timestamp sequence and ambiguity rejection before timing.'),
('Compatible GPU texture storage is reused only after the final consumer, including delayed preview and resolution transitions.','Unique simultaneously live compatible allocations; physical GPU memory must be observed separately.'),
('Independent remux record binds source/output identity, packet offsets/hashes/config and relative timing; five malformed records must reject.','Correct rejection coverage and observer cost, not playback speed.'),
('TS selected-track pruning preserves all selected AV packet payloads and timestamps plus coherent PAT/PMT/PID/PCR/continuity.','Output transport bytes with identical required tracks and valid decode.'),
('MP3 target PCM suffix matches the continuous decoder including delay/priming; preroll is profile-specific, not fixed universally.','Minimum validated coded dependency window for an exact PCM target.'),
('Partitioned audio jobs match the same continuous resampler sample count, phase, edge delay and required numerical output using absolute output intervals.','Correct boundary samples and total job work including halo reads.'),
('ROI through a fixed filter graph preserves every visible pixel using exact halos; unknown/global/temporal effects use full-region path.','Processed intermediate pixels plus dependency propagation and copy costs.'),
('Only already-requested fixed linear mixing and compatible resampling may commute; preserve layout contract, delay, samples and rounding.','Actual resampler channel work after checking current library ordering.'),
('Ordinary decoder batches retain state and output required identities; delayed pictures, bounded outstanding work and true EOF drains remain.','Unnecessary ordinary-batch flush count and operation completion latency.'),
('Symbolic silence represents validated zero media samples at exact clock intervals and preserves every filter tail; materialize at unsupported stages.','Avoided sample allocation/processing including zero-span materialization.'),
('Only positively identified nonessential H264 annotation may be removed; VCL, timing, color, mastering and requested SEI semantics remain exact.','Removed bytes and complete packet-processing cost on explicitly eligible metadata.'),
('Persistent 8-bit scalar-image histogram updates subtract old tiles and add new tiles, preserving full-image exact statistics after each edit.','Incremental update work versus full recomputation for actual sparse edits.'),
('Sparse edit correction for fixed LTI FIR includes complete convolution support/tail and exactly matches full recomputed output.','Corrected support length and total cache/update work for an actual editing consumer.'),
('Injected stage delay leaves media bytes/timestamps unchanged and is attributed to one read/process/append boundary with actual presentation witness.','Maximum bounded delay before target presentation misses, with baseline queue state.'),
('Explicit immutable seek fragment recipe preserves payloads/config/PTS/DTS/trimming and only valid random-access entry points, regardless of construction order.','Cold plus repeated-seek reconstruction cost including index and source work.'),
('Compact MP4 timing queries preserve every offset/size/time/config/sync flag over admitted tables; reordered pictures require an explicit separate gate.','Actual metadata live bytes, startup and random query cost against current parser.'),
('Compaction migrates all internal live immutable packet handles without invalidating external/duplicate/delayed consumers or changing packet identity.','Unique retained backing bytes versus useful packet bytes, copy volume and session cost.')]
for d,(contract,metric) in zip(a,contracts):
 d['requested_output_contract']=contract;d['measurement']['primary_metric']=metric
 audit=p/d['evidence'][0]['path'];s=audit.read_text();s+='\n## Item-specific contract and metric\n\n'+contract+'\n\n'+metric+'\n\n## Current owner byte identities\n\n'
 for owner in d['current_code_paths']:
  name=owner.split(':')[0];raw=pathlib.Path(name).read_bytes();s+=f'- `{name}` SHA256 `{hashlib.sha256(raw).hexdigest()}`\n'
 audit.write_text(s);d['evidence'][0]['sha256']=hashlib.sha256(s.encode()).hexdigest()
f.write_text(json.dumps(a,indent=2)+'\n')
spec=importlib.util.spec_from_file_location('s',p/'tools/screening.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);items=json.loads((p/'work/batch_c/assignment.json').read_text())
for d in a:m.validate_record(p,items,d)
print('32 item-specific contracts and owner digests validated; no ledger changes')
