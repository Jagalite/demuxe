import json,pathlib,hashlib,importlib.util
P=pathlib.Path.cwd();W=P/'work/batch_a'; data=json.load(open(W/'decisions.json')); evidence=P/'evidence/prerequisites/result.json'; eh=hashlib.sha256(evidence.read_bytes()).hexdigest()
notes={
353:'The coordinator shared raw secure-localhost Chrome 152 gate was inspected: ManagedMediaSource is undefined in both window and worker. Ordinary MediaSource is present. This specifically blocks real managed demand/eviction signals on this browser; it does not reject the scheduling idea or other browsers.',
57:'The shared raw gate reports MSE audio/mp4 FLAC true. Its AudioDecoder FLAC query threw TypeError without a complete FLAC description; that is not a six-channel test or a six-channel rejection. The six-by-six preservation matrix remains the useful next test.',
88:'The shared raw gate reports native HLS canPlayType maybe. This only permits trying the direct playlist: no requests, A/V output, seek or EOF were established by the query.',
24:'The shared gate reports VideoFrame exists on secure localhost Chrome 152. No raw-layout construction or actual pixels were tested, so the existing drawYUV boundary comparison remains necessary.',
335:'The shared gate found an Apple Metal-3 nonfallback WebGPU adapter, but current Demuxe still has no WebGPU presenter owner to recover. Do not carry forward a historical absence of GPU APIs.',
99:'The shared gate accepts one hvc1.1.6.L93.B0 VideoDecoder configuration. It does not establish profile-8.1 input, native HDR metadata or physical HDR display output.',
184:'The shared gate accepts one HEVC VideoDecoder configuration and exposes WebGPU. Historical opaque-page API absence is superseded for this configuration only; trusted RPU input and actual reshaping/output remain absent.',
82:'The shared gate exposes VideoDecoder and AudioEncoder; it did not query VideoEncoder. Historical opaque-page VideoDecoder absence is not a present blocker; the normalization timestamp/encoder owner remains missing.',
194:'The shared raw component result decoded 850 deflate bytes exactly and rejected a bad checksum. It does not test persistent Z_SYNC_FLUSH boundaries, ZMBV motion/XOR state or GPU reconstruction; those mechanism-specific gaps remain.',
172:'The shared WebGPU adapter advertises texture-compression-bc. This is a destination hint for BC1 only; no Hap payload unwrap, compressed upload, sampled output or WebGL S3TC was exercised.',
193:'The shared gate accepts one HEVC VideoDecoder configuration. It does not provide a tiled HEIC item graph or prove tile independence/composition, so historical missing browser API is not used as the local blocker.',
195:'The shared adapter advertises BC, ETC2 and ASTC texture compression. This removes a blanket GPU-capability absence claim but does not supply Basis/ETC1S input, transcoder or two actual rendered destinations.'}
for d in data:
 n=int(d['key'].split('.')[0][1:])
 if n not in notes:continue
 note=notes[n];d['evidence_level']='IMPORTED_LOCAL_EVIDENCE';d['tested_profile']='Current source owners plus inspected coordinator secure-localhost Chrome 152 prerequisite evidence; complete mechanism not executed'
 d['evidence'].append({'path':'evidence/prerequisites/result.json','sha256':eh,'note':note})
 d['probe']['method']+='; inspected shared raw local prerequisite result';d['probe']['outcome']+=' '+note
 d['limits'][0]='Shared prerequisite probes do not establish complete-route playback, benefit or physical output.'
 if n==353:
  d['decision']='HOLD_ENV';d['reason']=note;d['next_test']='Use a browser/device with ManagedMediaSource, then a short actual demand/eviction trace on fixed H264/AAC; no simulated event can qualify real browser eviction.';d['reopen_condition']='Reopen when an authorized browser exposes ManagedMediaSource and managed demand signals; ordinary MSE availability alone is insufficient.'
 audit=P/d['evidence'][0]['path'];text=audit.read_text();text=text.replace('Decision draft: **ADVANCE_CONFIRMATION**. Evidence: SOURCE_REVIEW.','Decision draft: **HOLD_ENV**. Evidence: IMPORTED_LOCAL_EVIDENCE.') if n==353 else text.replace('Evidence: SOURCE_REVIEW.','Evidence: SOURCE_REVIEW plus IMPORTED_LOCAL_EVIDENCE.')
 text+='\n## Shared local prerequisite evidence inspected\n\n'+note+'\n\nComplete mechanism execution: none. The shared probe belongs to the coordinator; no duplicate probe ran in this workspace.\n';audit.write_text(text);d['evidence'][0]['sha256']=hashlib.sha256(audit.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('screen',P/'tools/screening.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);items=json.load(open(W/'assignment.json'))
for d in data:m.validate_record(P,items,d)
(W/'decisions.json').write_text(json.dumps(data,indent=2)+'\n')
from collections import Counter
print('Validated',len(data),'decision drafts:',dict(Counter(d['decision'] for d in data)))
