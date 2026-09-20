# SPDX-License-Identifier: Apache-2.0
from pathlib import Path
import sys,json,io,hashlib,importlib.metadata,base64
import tink
from tink import streaming_aead,cleartext_keyset_handle
from tink.proto import aes_gcm_hkdf_streaming_pb2
streaming_aead.register();out=Path(sys.argv[1]);source=Path('research/shared/runs/20260919T214800Z-progressive-fidelity/source.mp4');plain=source.read_bytes();handle=tink.new_keyset_handle(streaming_aead.streaming_aead_key_templates.AES128_GCM_HKDF_4KB);p=handle.primitive(streaming_aead.StreamingAead);aad=b'demuxe-owned-research-source-v1';f=open(out/'source.tink','wb')
with p.new_encrypting_stream(f,aad) as w:w.write(plain)
with p.new_decrypting_stream(open(out/'source.tink','rb'),aad) as r:ref=r.read()
assert ref==plain
text=io.StringIO();cleartext_keyset_handle.write(tink.JsonKeysetWriter(text),handle);ks=json.loads(text.getvalue());key=aes_gcm_hkdf_streaming_pb2.AesGcmHkdfStreamingKey.FromString(base64.b64decode(ks['key'][0]['keyData']['value']));(out/'reference.mp4').write_bytes(ref);(out/'public-test-key.json').write_text(json.dumps({'notice':'Synthetic public test key only. Not user credentials or content protection.','key':key.key_value.hex(),'aad':aad.hex(),'segmentBytes':key.params.ciphertext_segment_size,'derivedKeyBytes':key.params.derived_key_size,'hkdfHashType':key.params.hkdf_hash_type},indent=2));(out/'provenance.json').write_text(json.dumps({'tinkVersion':importlib.metadata.version('tink'),'source':str(source),'plainSHA256':hashlib.sha256(plain).hexdigest(),'cipherSHA256':hashlib.sha256((out/'source.tink').read_bytes()).hexdigest(),'referenceExact':True,'format':'Official Tink AES128_GCM_HKDF_4KB StreamingAEAD; independent Python encrypt/decrypt oracle.','docs':'https://developers.google.com/tink/streaming-aead/aes_gcm_hkdf_streaming'},indent=2))
