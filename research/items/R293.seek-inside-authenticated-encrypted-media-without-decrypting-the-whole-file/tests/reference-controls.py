# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,io
import tink
from tink import streaming_aead,cleartext_keyset_handle
from tink.proto import tink_pb2,aes_gcm_hkdf_streaming_pb2
streaming_aead.register();out=Path(sys.argv[1]);c=json.loads((out/'public-test-key.json').read_text());k=aes_gcm_hkdf_streaming_pb2.AesGcmHkdfStreamingKey(version=0,key_value=bytes.fromhex(c['key']));k.params.ciphertext_segment_size=c['segmentBytes'];k.params.derived_key_size=c['derivedKeyBytes'];k.params.hkdf_hash_type=c['hkdfHashType'];ks=tink_pb2.Keyset(primary_key_id=1);entry=ks.key.add(key_id=1,status=tink_pb2.ENABLED,output_prefix_type=tink_pb2.RAW);entry.key_data.type_url='type.googleapis.com/google.crypto.tink.AesGcmHkdfStreamingKey';entry.key_data.value=k.SerializeToString();entry.key_data.key_material_type=tink_pb2.KeyData.SYMMETRIC;p=cleartext_keyset_handle.from_keyset(ks).primitive(streaming_aead.StreamingAead);cipher=(out/'source.tink').read_bytes();aad=bytes.fromhex(c['aad']);controls={}
for mode in ['valid','salt','nonce','headerLength','lastTruncated','reordered']:
 b=bytearray(cipher)
 if mode=='salt':b[1]^=1
 if mode=='nonce':b[17]^=1
 if mode=='headerLength':b[0]=40
 if mode=='lastTruncated':b=b[:-1]
 if mode=='reordered':b[4096:8192],b[8192:12288]=b[8192:12288],b[4096:8192]
 try:
  with p.new_decrypting_stream(io.BytesIO(bytes(b)),aad) as f:decoded=f.read()
  assert mode=='valid' and decoded==(out/'reference.mp4').read_bytes();controls[mode]='exact'
 except tink.TinkError as e:
  assert mode!='valid';controls[mode]=str(e)
(out/'reference-controls.json').write_text(json.dumps(controls,indent=2))
