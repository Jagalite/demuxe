# SPDX-License-Identifier: Apache-2.0
"""Apply isolated research changes to pinned MIT OxideAV checkout, never production."""
import pathlib,subprocess,sys
root=pathlib.Path(sys.argv[1]);tools=pathlib.Path(__file__).parent
p=root/'src/lib.rs';s=p.read_text();s+='\npub mod research_translate;\n';p.write_text(s)
(root/'src/research_translate.rs').write_bytes((tools/'translate.rs').read_bytes())
p=root/'src/slice_header.rs';s=p.read_text();s+='\nthread_local! { static RESEARCH_BITS: std::cell::Cell<(usize,usize)> = const {std::cell::Cell::new((0,0))}; }\npub fn research_cabac_bits()->(usize,usize){RESEARCH_BITS.with(|c|c.get())}\n'
s=s.replace('let cabac_init_idc = if pps.entropy_coding_mode_flag', 'let research_start=r.position();\n        let cabac_init_idc = if pps.entropy_coding_mode_flag')
s=s.replace('// §7.3.3 — slice_qp_delta se(v).','let research_end=r.position();\n        RESEARCH_BITS.with(|c|c.set((research_start.0*8+research_start.1 as usize,research_end.0*8+research_end.1 as usize)));\n        // §7.3.3 — slice_qp_delta se(v).')
p.write_text(s)
(root/'src/bin').mkdir(exist_ok=True)
(root/'src/bin/research_entropy.rs').write_bytes((tools/'main.rs').read_bytes())
subprocess.run([sys.executable,str(tools/'checkpoint_patch.py'),str(root)],check=True)
subprocess.run(['cargo','build','--release','--locked','--manifest-path',str(root/'Cargo.toml'),'--bin','research_entropy'],check=True)
