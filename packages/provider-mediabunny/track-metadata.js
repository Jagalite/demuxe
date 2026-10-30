// SPDX-License-Identifier: Apache-2.0
/** Preserve Demuxe's type-scoped IDs and global stream indexes at the provider
 * boundary. Metadata describes the copied source, not new decode claims. */
export function preparedTracks(sourceTracks){
  return sourceTracks.map(track=>({id:track.id,type:track.type,codec:track.codec,selected:true,
    ...(Number.isSafeInteger(track.index)&&track.index>=0?{'ff-index':track.index}:{}),
    ...(typeof track.title==='string'?{title:track.title}:{}),
    ...(typeof track.lang==='string'?{lang:track.lang}:{}),
    ...(typeof track.default==='boolean'?{default:track.default}:{}),
    ...(Number.isFinite(track.sampleRate)&&track.sampleRate>0?{sampleRate:track.sampleRate}:{}),
    ...(track.channels===1?{channels:1,'demux-channels':'mono'}:track.channels===2?{channels:2,'demux-channels':'stereo'}:{}),
  }));
}
