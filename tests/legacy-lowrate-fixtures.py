#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Retain original low-rate MP2/WMA packets, actual ASF framing and scalar PCM."""
import hashlib, json, os, pathlib, shutil, struct, subprocess, math
from fractions import Fraction

root = pathlib.Path(os.environ.get('LEGACY_LOWRATE_ROOT', '/tmp/demuxe-legacy-lowrate-fixtures'))
root.mkdir(parents=True, exist_ok=True)
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args): return subprocess.check_output(args)
def framing(p):
    data = p.read_bytes(); pos = 30
    for _ in range(struct.unpack_from('<I', data, 24)[0]):
        guid = data[pos:pos+16]; size = struct.unpack_from('<Q', data, pos+16)[0]
        assert size >= 24 and pos+size <= len(data)
        if guid == bytes.fromhex('9107dcb7b7a9cf118ee600c00c205365') and data[pos+24:pos+40] == bytes.fromhex('409e69f84d5bcf11a8fd00805f5c442b'):
            count = struct.unpack_from('<I', data, pos+64)[0]; fmt = data[pos+78:pos+78+count]
            tag, channels, rate, average, align, bits, extra = struct.unpack_from('<HHIIHHH', fmt)
            assert len(fmt) == 18+extra
            return dict(codecTag=tag, channels=channels, sampleRate=rate, bitRate=average*8,
                        blockAlign=align, bitsPerSample=bits, extradataHex=fmt[18:].hex(), waveFormatHex=fmt.hex())
        pos += size
    raise ValueError('Missing ASF audio format')

tools = {}
for binary in ['ffmpeg', 'ffprobe']:
    p = pathlib.Path(shutil.which(binary)).resolve()
    tools[binary] = dict(path=str(p), sha256=digest(p), version=run([str(p), '-version']).decode().splitlines()[0])
rows = []; compositions = []
for codec in ['mp2', 'wmav1', 'wmav2']:
    for rate in ([32000] if codec == 'mp2' else [8000, 16000, 22050, 32000]):
        for channels in [1, 2]:
            ident = f'{codec}-lowrate-{rate}-{channels}'
            media = root/(ident+('.mkv' if codec == 'mp2' else '.wma'))
            bitrate = 128000 if codec == 'mp2' else {8000:32000,16000:64000,22050:64000,32000:96000}[rate]
            tones = [337+191*c for c in range(channels)]
            wave = '|'.join(f'0.09*sin(2*PI*{hz}*t)' for hz in tones)
            run(['ffmpeg','-v','error','-y','-f','lavfi','-i',f'aevalsrc={wave}:s={rate}:d=6.137',
                 '-c:a',codec,'-b:a',str(bitrate),'-ac',str(channels),'-ar',str(rate),str(media)])
            packet = root/(ident+'.json')
            packet.write_bytes(run(['ffprobe','-v','error','-show_streams','-show_packets','-show_data','-of','json',str(media)]))
            stream = json.loads(packet.read_bytes())['streams'][0]
            assert int(stream['sample_rate']) == rate and stream['channels'] == channels and stream['codec_name'] == codec
            ref = root/(ident+'.f32')
            run(['ffmpeg','-v','error','-cpuflags','0','-y',*(['-c:a','mp2float'] if codec == 'mp2' else []),
                 '-i',str(media),'-map','0:a:0','-f','f32le',str(ref)])
            frames = root/(ident+'.frames.json')
            frames.write_bytes(run(['ffprobe','-v','error','-select_streams','a:0','-show_frames',
                                   '-show_entries','frame=pts_time,best_effort_timestamp_time,nb_samples','-of','json',str(media)]))
            segments = []; recovered_final = False
            for i, frame in enumerate(json.loads(frames.read_bytes())['frames']):
                if 'pts_time' in frame: pts = math.floor(float(frame['pts_time'])*rate+.5)
                else:
                    assert codec.startswith('wma') and i == len(json.loads(frames.read_bytes())['frames'])-1 and segments
                    pts = segments[-1]['pts']+segments[-1]['samples']; recovered_final = True
                segments.append(dict(pts=pts,samples=frame['nb_samples']))
            assert sum(f['samples'] for f in segments) == ref.stat().st_size//(4*channels)
            timing = root/(ident+'.timing.json')
            tolerance = math.ceil(rate*Fraction(stream['time_base'])/2) if codec=='mp2' else 0
            timing.write_text(json.dumps(dict(segments=segments,toleranceSamples=tolerance,sourceTimeBase=stream['time_base'],
                sourceFramesSHA256=digest(frames),referenceTools=tools,
                finalDrainClock='previous-native-frame-end' if recovered_final else 'native-PTS'),indent=2)+'\n')
            fmt = framing(media) if codec.startswith('wma') else {}
            if fmt: assert fmt['sampleRate'] == rate and fmt['channels'] == channels and fmt['codecTag'] == (0x160 if codec == 'wmav1' else 0x161)
            row = dict(id=ident,profile='legacy',codec=codec,sampleRate=rate,channels=channels,
                       bitsPerSample=fmt.get('bitsPerSample',16),generated=True,input=str(media),
                       inputSHA256=digest(media),packetSHA256=digest(packet),framesSHA256=digest(frames),
                       referenceF32SHA256=digest(ref),referenceSamples=ref.stat().st_size//(4*channels),
                       timingFile=str(timing),timingSHA256=digest(timing),framing=fmt,frequencies=tones,referenceTools=tools,legacyProfile='lower-rate-pcm',fixtureRoot=str(root),seekContract='restart-from-start-and-discard')
            rows.append(row)
            video = root/(ident+'-video.mkv')
            run(['ffmpeg','-v','error','-y','-f','lavfi','-i','testsrc2=size=96x64:rate=25:duration=6.137',
                 '-i',str(media),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','ultrafast',
                 '-bf','0','-g','25','-c:a','copy',str(video)])
            compositions.append(dict(**{**row,'id':ident+'-video','input':str(video),'inputSHA256':digest(video)},output='flac'))
for name, value in [('fixtures.json',rows),('compositions.json',compositions),('packet-browser.json',rows),('reference-tools.json',tools)]:
    (root/name).write_text(json.dumps(value,indent=2)+'\n')
print(len(rows), 'low-rate source tuples retained at',root)
