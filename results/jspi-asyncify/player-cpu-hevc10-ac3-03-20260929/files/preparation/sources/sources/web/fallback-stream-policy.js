// SPDX-License-Identifier: Apache-2.0
// Admission guards for the limited FFmpeg/mpv fallback only. Shaka parses and
// executes production adaptive streams. Accepted bytes go to FFmpeg unchanged;
// this file does not parse timelines, select renditions or manufacture resources.
export function validateFallbackOptions(options={}){
  if(options.maxBandwidth!==undefined||options.representation!==undefined){
    throw Error('FFmpeg streaming fallback cannot preserve bandwidth or representation selection; Shaka is required');
  }
}

export function validateFallbackManifest(bytes,format,options={}){
  validateFallbackOptions(options);
  const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
  if(format==='hls'){
    const lines=text.split(/\r?\n/).map(line=>line.trim());
    if(lines[0]!=='#EXTM3U')throw Error('Invalid HLS fallback manifest');
    if(lines.some(line=>/^#EXT-X-(KEY|SESSION-KEY|PART|PRELOAD-HINT|SERVER-CONTROL|RENDITION-REPORT|SKIP):/.test(line))){
      throw Error('Encrypted or low-latency HLS requires Shaka; FFmpeg fallback is ineligible');
    }
    if(lines.some(line=>line.startsWith('#EXT-X-MEDIA:')&&/(?:[:,])TYPE=SUBTITLES(?:,|$)/.test(line))){
      throw Error('HLS subtitle renditions require Shaka; FFmpeg fallback cannot preserve subtitle semantics');
    }
    const master=lines.some(line=>line.startsWith('#EXT-X-STREAM-INF:'));
    if(!options.live&&!master&&!lines.includes('#EXT-X-ENDLIST'))throw Error('Live HLS fallback requires streaming.live');
    return;
  }
  if(format!=='dash')throw Error('Unknown fallback streaming format');
  // Do not allow external declarations to bypass the restricted transport or
  // namespace spellings to hide a feature from these conservative guards.
  if(/<!DOCTYPE|<!ENTITY|<!\[CDATA\[|&#/i.test(text))throw Error('Unsupported DASH fallback XML declaration');
  const clean=text.replace(/<!--[\s\S]*?-->/g,'').replace(/<\?xml[^?]*\?>/g,'');
  if(/<\/?[\w.-]+:/.test(clean))throw Error('Namespaced DASH elements require Shaka');
  const root=/<MPD\b([^>]*)>/.exec(clean);
  if(!root)throw Error('Invalid DASH fallback manifest');
  if(!options.live&&!/\btype\s*=\s*(['"])static\1/.test(root[1]))throw Error('Live DASH fallback requires streaming.live');
  if((clean.match(/<Period\b/g)??[]).length!==1)throw Error('Multiple DASH periods require Shaka; FFmpeg fallback cannot preserve period semantics');
  if(/<(?:ContentProtection|Location|PatchLocation|EventStream)\b|\bxlink:/.test(clean))throw Error('DASH extensions require Shaka; FFmpeg fallback is ineligible');
  if(/\bcontentType\s*=\s*(['"])(?:text|image)\1|\bmimeType\s*=\s*(['"])(?:text\/|application\/ttml)/.test(clean)||/\bcodecs\s*=\s*(['"])(?:stpp|wvtt)/.test(clean)){
    throw Error('DASH text or image tracks require Shaka; FFmpeg fallback cannot preserve track semantics');
  }
}
