# SPDX-License-Identifier: Apache-2.0
"""Add explicit pointer-free complete slice-grammar checkpoint to pinned research copy."""
import pathlib,sys
root=pathlib.Path(sys.argv[1]);p=root/'Cargo.toml';s=p.read_text().replace('[dependencies]','[dependencies]\nserde = {version="1",features=["derive"]}\nserde_json = "1"\nsha2 = "0.10"');p.write_text(s)
p=root/'src/macroblock_layer.rs';s=p.read_text()
for name in ['Intra16x16','MbPartPredMode','MbType','SubMbType','PcmSamples','MbPred','SubMbPred','Macroblock','CavlcMbNc','CavlcNcGrid','CabacMbNeighbourInfo','CabacNeighbourGrid']:
 import re
 pattern=r'(pub (?:struct|enum) '+name+r'\b)';s=re.sub(pattern,r'#[derive(serde::Serialize,serde::Deserialize)]\n\1',s)
p.write_text(s)
p=root/'src/bitstream.rs';s=p.read_text().replace("impl<'a> BitReader<'a> {", "impl<'a> BitReader<'a> {\n    pub fn research_restore(data:&'a [u8], byte_pos:usize,bit_pos:u8)->Self{assert!((byte_pos<data.len() || (byte_pos==data.len() && bit_pos==0)) && bit_pos<8);Self{data,byte_pos,bit_pos}}") ;p.write_text(s)
p=root/'src/cabac.rs';s=p.read_text().replace("impl<'a> CabacDecoder<'a> {", """impl<'a> CabacDecoder<'a> {
 pub fn research_state(&self)->(u32,u32,usize,u8,u64){let(b,t)=self.position();(self.cod_i_range,self.cod_i_offset,b,t,self.bin_count)}
 pub fn research_restore(data:&'a [u8],s:(u32,u32,usize,u8,u64))->Self{assert!(s.0>=256 && s.0<=510 && s.1<s.0);Self{cod_i_range:s.0,cod_i_offset:s.1,reader:BitReader::research_restore(data,s.2,s.3),bin_count:s.4}}
""");p.write_text(s)
p=root/'src/slice_data.rs';s=p.read_text();s+='''
// Research checkpoint is explicit codec syntax state, never a heap/process image.
#[derive(serde::Serialize,serde::Deserialize)]
struct ResearchCheckpoint {
 version:u32, source_sha256:String, header_identity:String,
 arithmetic:(u32,u32,usize,u8,u64), contexts:Vec<(u8,u8)>,
 curr_mb_addr:u32, prev_mb_skipped:bool, prev_mb_qp_delta_nonzero_slice:bool,
 pending_pair_flag:Option<bool>, cavlc_nc:CavlcNcGrid, cabac_nb:CabacNeighbourGrid,
 macroblocks:Vec<Macroblock>, mb_field_decoding_flags:Vec<bool>,
}
fn research_sha(data:&[u8])->String{use sha2::{Digest,Sha256};format!("{:x}",Sha256::digest(data))}
'''
needle='''        loop {
            // Debug marker for bin-level trace'''
replace='''        let research_mode=std::env::var("DEMUXE_CP_MODE").unwrap_or_default();
        let research_dir=std::env::var("DEMUXE_CP_DIR").unwrap_or_default();
        let research_source=research_sha(rbsp);
        let research_path=std::path::Path::new(&research_dir).join(format!("{}.json",research_source));
        let research_boundary=std::env::var("DEMUXE_CP_MB").ok().and_then(|v|v.parse::<u32>().ok()).unwrap_or(pic_size_in_mbs/2);
        if research_mode=="restore" {
            let bytes=std::fs::read(&research_path).expect("checkpoint source identity absent");
            let envelope:serde_json::Value=serde_json::from_slice(&bytes).unwrap();
            let payload=envelope["payload"].as_str().unwrap();
            assert_eq!(research_sha(payload.as_bytes()),envelope["sha256"].as_str().unwrap(),"checkpoint integrity");
            let cp:ResearchCheckpoint=serde_json::from_str(payload).unwrap();
            assert_eq!(cp.version,1);assert_eq!(cp.source_sha256,research_source,"wrong source");
            assert_eq!(cp.header_identity,format!("{:?}|{:?}|{:?}",slice_header,sps,pps),"wrong parameters");
            assert_eq!(cp.curr_mb_addr,cp.macroblocks.len() as u32);assert!(cp.curr_mb_addr<pic_size_in_mbs);
            cabac_dec=CabacDecoder::research_restore(remainder,cp.arithmetic);
            assert_eq!(ctxs.contexts.len(),cp.contexts.len());
            for (c,(state,mps)) in ctxs.contexts.iter_mut().zip(cp.contexts){assert!(state<64 && mps<2);c.state_idx=state;c.val_mps=mps;}
            curr_mb_addr=cp.curr_mb_addr;prev_mb_skipped=cp.prev_mb_skipped;
            prev_mb_qp_delta_nonzero_slice=cp.prev_mb_qp_delta_nonzero_slice;
            pending_pair_flag=cp.pending_pair_flag;cavlc_nc=cp.cavlc_nc;cabac_nb=cp.cabac_nb;
            macroblocks=cp.macroblocks;mb_field_decoding_flags=cp.mb_field_decoding_flags;
            if std::env::var_os("DEMUXE_CP_OMIT_NEIGHBORS").is_some(){cabac_nb=CabacNeighbourGrid::new(pic_w_mbs,pic_h_mbs);}
            eprintln!("RESTORE source={} mb={} bit={} prefix_bins_skipped={}",research_source,curr_mb_addr,cp.arithmetic.2*8+cp.arithmetic.3 as usize,cp.arithmetic.4);
        }
        loop {
            if research_mode=="capture" && curr_mb_addr==research_boundary {
                let cp=ResearchCheckpoint{version:1,source_sha256:research_source.clone(),header_identity:format!("{:?}|{:?}|{:?}",slice_header,sps,pps),arithmetic:cabac_dec.research_state(),contexts:ctxs.contexts.iter().map(|c|(c.state_idx,c.val_mps)).collect(),curr_mb_addr,prev_mb_skipped,prev_mb_qp_delta_nonzero_slice,pending_pair_flag,cavlc_nc:cavlc_nc.clone(),cabac_nb:cabac_nb.clone(),macroblocks:macroblocks.clone(),mb_field_decoding_flags:mb_field_decoding_flags.clone()};
                let payload=serde_json::to_string(&cp).unwrap();let envelope=serde_json::json!({"sha256":research_sha(payload.as_bytes()),"payload":payload});
                std::fs::create_dir_all(&research_dir).unwrap();let tmp=research_path.with_extension("tmp");std::fs::write(&tmp,serde_json::to_vec(&envelope).unwrap()).unwrap();std::fs::rename(tmp,&research_path).unwrap();
            }
            // Debug marker for bin-level trace'''
assert needle in s;s=s.replace(needle,replace);p.write_text(s)
