// SPDX-License-Identifier: Apache-2.0
//! Restricted syntax-only CABAC to CAVLC translation. No reconstruction/quantization.
use crate::decoder::{Decoder,Event};
use crate::encoder::bitstream::BitWriter;
use crate::encoder::cavlc::encode_residual_block_cavlc as residual;
use crate::cavlc::CoeffTokenContext as CT;
use crate::macroblock_layer::*;
use crate::slice_header::SliceType;
use crate::nal::{AnnexBSplitter,parse_nal_unit};
fn emit(out:&mut Vec<u8>,header:u8,rbsp:&[u8]) {out.extend([0,0,0,1,header]);let mut z=0;for &b in rbsp {if z>=2 && b<=3 {out.push(3);z=0;}out.push(b);z=if b==0{z+1}else{0};}}
fn bit(data:&[u8],i:usize)->u32{((data[i/8]>>(7-i%8))&1) as u32}
pub fn translate(data:&[u8], corrupt:bool)->(Vec<u8>,usize,usize) {
 let mut decoder=Decoder::new();let mut out=Vec::new();let mut total=0;let mut nz=0;
 for nal in AnnexBSplitter::new(data) {
  let event=decoder.process_nal(nal).expect("parse NAL/header");
  match event {
   Event::PpsStored(_) => {let n=parse_nal_unit(nal).unwrap();let mut p=n.rbsp.to_vec();let mut r=crate::bitstream::BitReader::new(&p);r.ue().unwrap();r.ue().unwrap();let (b,t)=r.position();p[b]&=!(1<<(7-t));emit(&mut out,nal[0],&p);},
   Event::Slice{header,rbsp,slice_data_cursor,pps,sps,..}=>{
    assert!(pps.entropy_coding_mode_flag,"requires CABAC input");assert!(sps.frame_mbs_only_flag && sps.chroma_array_type()==1 && sps.bit_depth_luma_minus8==0 && sps.bit_depth_chroma_minus8==0);
    assert!(!pps.transform_8x8_mode_flag() && pps.num_slice_groups_minus1==0 && !pps.constrained_intra_pred_flag);
    assert!(matches!(header.slice_type,SliceType::I|SliceType::P));assert!(header.first_mb_in_slice==0);
    let parsed=crate::slice_data::parse_slice_data(&rbsp,slice_data_cursor.0,slice_data_cursor.1,&header,&sps,&pps).expect("parse macroblock syntax");
    let mut w=BitWriter::new();let end=slice_data_cursor.0*8+slice_data_cursor.1 as usize;
    let skip=crate::slice_header::research_cabac_bits();
    for i in 0..end {if i<skip.0 || i>=skip.1 {w.u(1,bit(&rbsp,i));}}
    let mut grid=CavlcNcGrid::new(sps.pic_width_in_mbs_minus1+1,sps.pic_height_in_mbs(false));let mut skips=0;
    for (mi,m) in parsed.macroblocks.iter().enumerate(){
     total+=1;let intra=m.mb_type.is_intra();let i16=m.mb_type.is_intra_16x16();
     if m.is_skip {skips+=1;grid.mbs[mi].is_available=true;grid.mbs[mi].is_skip=true;continue;}
     if header.slice_type==SliceType::P {w.ue(skips);skips=0;}
     assert!(!m.transform_size_8x8_flag && m.sub_mb_pred.is_none(),"unsupported subpartition or 8x8 transform");
     w.ue(m.mb_type_raw);
     if m.mb_type.is_i_pcm(){w.align_to_byte_zero();let p=m.pcm_samples.as_ref().unwrap();for v in p.luma.iter().chain(&p.chroma_cb).chain(&p.chroma_cr){w.u(8,*v);}grid.mbs[mi].is_available=true;grid.mbs[mi].is_i_pcm=true;continue;}
     let pred=m.mb_pred.as_ref().unwrap();
     if intra {
      if m.mb_type.is_i_nxn(){for j in 0..16 {w.u(1,pred.prev_intra4x4_pred_mode_flag[j] as u32);if !pred.prev_intra4x4_pred_mode_flag[j]{w.u(3,pred.rem_intra4x4_pred_mode[j] as u32);}}}
      w.ue(pred.intra_chroma_pred_mode as u32);
     }else{
      assert!(matches!(m.mb_type,MbType::PL016x16|MbType::PL0L016x8|MbType::PL0L08x16));
      for &idx in &pred.ref_idx_l0 {if header.num_ref_idx_l0_active_minus1>0 {w.te(header.num_ref_idx_l0_active_minus1,idx);}}
      for mv in &pred.mvd_l0{w.se(mv[0]);w.se(mv[1]);}
     }
     let cbp=m.coded_block_pattern;
     if !i16 {
      let intra_table=[47,31,15,0,23,27,29,30,7,11,13,14,39,43,45,46,16,3,5,10,12,19,21,26,28,35,37,42,44,1,2,4,8,17,18,20,24,6,9,22,25,32,33,34,36,40,38,41];
      let inter_table=[0,16,1,2,4,8,32,3,5,10,12,15,47,7,11,13,14,6,9,31,35,37,42,44,33,34,36,40,39,43,45,46,17,18,20,24,19,21,26,28,23,27,29,30,22,25,38,41];
      w.ue(if intra{&intra_table}else{&inter_table}.iter().position(|&v|v==cbp).unwrap() as u32);
     }
     grid.mbs[mi].is_available=true;grid.mbs[mi].is_intra=intra;
     if cbp!=0 || i16 {
      w.se(m.mb_qp_delta);
      if i16 {let nc=derive_nc_luma(&grid,mi as u32,0,LumaNcKind::Intra16x16Dc,intra,false);let coeff=m.residual_luma_dc.unwrap();nz+=coeff.iter().filter(|&&x|x!=0).count();residual(&mut w,CT::Numeric(nc),16,&coeff).unwrap();}
      let mut packed=0;for j in 0..16 {if cbp&(1<<(j/4))!=0 {
       let nc=derive_nc_luma(&grid,mi as u32,j as u8,LumaNcKind::Ac,intra,false);
       let mut coeff=m.residual_luma[packed];packed+=1;if corrupt && mi==0 && j==0{coeff[15]+=1;}
       let c=if i16{&coeff[..15]}else{&coeff[..]};nz+=c.iter().filter(|&&x|x!=0).count();residual(&mut w,CT::Numeric(nc),if i16{15}else{16},c).unwrap();grid.mbs[mi].luma_total_coeff[j]=c.iter().filter(|&&x|x!=0).count() as u8;
      }}
      if cbp>>4!=0 {for c in [&m.residual_chroma_dc_cb,&m.residual_chroma_dc_cr]{nz+=c.iter().filter(|&&x|x!=0).count();residual(&mut w,CT::ChromaDc420,4,c).unwrap();}}
      if cbp>>4==2 {for cr in [false,true] {for j in 0..4 {let nc=derive_nc_chroma_ac(&grid,mi as u32,j as u8,cr,1,intra,false);let c=if cr{&m.residual_chroma_ac_cr[j][..15]}else{&m.residual_chroma_ac_cb[j][..15]};nz+=c.iter().filter(|&&x|x!=0).count();residual(&mut w,CT::Numeric(nc),15,c).unwrap();if cr{grid.mbs[mi].cr_total_coeff[j]=c.iter().filter(|&&x|x!=0).count() as u8;}else{grid.mbs[mi].cb_total_coeff[j]=c.iter().filter(|&&x|x!=0).count() as u8;}}}}
     }
    }
    if skips>0{w.ue(skips);}w.rbsp_trailing_bits();emit(&mut out,nal[0],&w.into_bytes());
   },
   _=>{out.extend([0,0,0,1]);out.extend(nal);}
  }
 }
 (out,total,nz)
}

pub fn syntax_signature(data:&[u8])->String {
 use sha2::{Digest,Sha256};let mut h=Sha256::new();let mut d=Decoder::new();
 for n in AnnexBSplitter::new(data){if let Event::Slice{header,rbsp,slice_data_cursor,pps,sps,..}=d.process_nal(n).unwrap(){let s=crate::slice_data::parse_slice_data(&rbsp,slice_data_cursor.0,slice_data_cursor.1,&header,&sps,&pps).unwrap();h.update(serde_json::to_vec(&s.macroblocks).unwrap());}}
 format!("{:x}",h.finalize())
}
