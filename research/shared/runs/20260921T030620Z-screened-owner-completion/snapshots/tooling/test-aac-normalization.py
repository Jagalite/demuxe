# SPDX-License-Identifier: Apache-2.0
"""Restricted AAC configuration contracts, exhaustive truncations and seeded fuzz."""
import ctypes
import hashlib
import json
from pathlib import Path
import random
import subprocess
import sys

context = json.loads(Path(sys.argv[1]).read_text())
build = Path(context['build'])
library = build / 'aac-normalization.dylib'
subprocess.run(['cc', '-shared', '-fPIC', '-O2', '-Wall', '-Wextra', '-Werror',
                'research/shared/tooling/aac-normalization.c', '-o', str(library)], check=True)
normalize = ctypes.CDLL(str(library.resolve())).demuxe_research_normalize_aac
normalize.argtypes = [ctypes.c_void_p, ctypes.c_size_t, ctypes.c_void_p, ctypes.c_void_p]


def call(data):
    out = ctypes.create_string_buffer(5)
    rate = ctypes.c_int(-1)
    count = normalize(data, len(data), out, ctypes.byref(rate))
    assert count in [0, 2, 5]
    return out.raw[:count], rate.value


def packed(bits):
    return int(bits + '0' * (-len(bits) % 8), 2).to_bytes((len(bits) + 7) // 8, 'big')


pce = bytes.fromhex('118004c40000200d4c61766336312e31392e31303156e500')
expected = bytes.fromhex('119056e500')
assert call(pce) == (expected, 48000)
assert call(expected)[0] == b''
checks = []
rates = [96000, 88200, 64000, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000, 7350]
for index, rate in enumerate(rates):
    for tail in ['', '010101101110010100000000']:
        explicit = packed('00010' + '1111' + f'{rate:024b}' + '0010' + '000' + tail)
        canonical = packed('00010' + f'{index:04b}' + '0010' + '000' + tail)
        assert call(explicit) == (canonical, rate)
        checks.append({'rate': rate, 'source': explicit.hex(), 'canonical': canonical.hex()})
for data in [pce, packed('00010'+'1111'+f'{48000:024b}'+'0010'+'000')]:
    minimum = 20 if data == pce else 5
    for n in range(minimum):
        assert call(data[:n])[0] == b'', (n, data.hex())
guards = {
    'non_table_rate': packed('00010'+'1111'+f'{48001:024b}'+'0010'+'000'),
    'mono_explicit': packed('00010'+'1111'+f'{48000:024b}'+'0001'+'000'),
    '960_frame': packed('00010'+'1111'+f'{48000:024b}'+'0010'+'100'),
    'core_dependency': packed('00010'+'1111'+f'{48000:024b}'+'0010'+'010'),
    'ga_extension': packed('00010'+'1111'+f'{48000:024b}'+'0010'+'001'),
    'sbr_present': pce[:-3]+bytes.fromhex('56e580'),
    'unknown_tail': pce+b'\x01',
    'nonzero_pce_tag': pce[:2]+bytes([pce[2]|0x10])+pce[3:],
    'multiple_front_elements': pce[:3]+bytes([pce[3]|0x08])+pce[4:],
}
for name, data in guards.items():
    assert call(data)[0] == b'', name
rng = random.Random(73119)
accepted = 0
for _ in range(20000):
    data = rng.randbytes(rng.randrange(301))
    output, rate = call(data)
    if output:
        accepted += 1
        assert output in [packed('00010'+f'{i:04b}'+'0010'+'000'+tail)
                          for i in range(13) for tail in ['', '010101101110010100000000']]
        assert rate in rates
result = {'passed': True, 'rate_table_profiles': checks, 'rejected_controls': list(guards),
          'truncations': 25, 'seeded_fuzz_cases': 20000, 'random_acceptances': accepted,
          'library_sha256': hashlib.sha256(library.read_bytes()).hexdigest(),
          'scope': 'Parser equivalence/guards only; browser qualification is separate.'}
Path(context['run'], 'aac-parser-contracts.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='rate_table_profiles'}, indent=2))
