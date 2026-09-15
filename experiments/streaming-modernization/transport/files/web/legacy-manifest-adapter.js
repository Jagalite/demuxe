// Compatibility only. Retire individual adapters after integrated demux coverage.
import {validateVODManifest} from './vod-manifest.js';
import {prepareDASH, selectHLS} from './streaming-manifest.js';
import {subtitleSegments, mergeWebVTT} from './segmented-subtitles.js';
const MiB = 1024 * 1024;

export class LegacyManifestAdapter {
  constructor(options, resolve, readAll) {
    this.options = options; this.resolve = resolve; this.readAll = readAll;
    this.virtual = new Map(); this.subtitlePlaylists = new Set();
  }
  get retainedBytes() {return [...this.virtual.values()].reduce((sum, bytes) => sum + bytes.byteLength, 0);}
  store(additions) {
    const next = new Map([...this.virtual, ...additions]);
    if (next.size > 1024 || [...next.values()].reduce((sum, bytes) => sum + bytes.byteLength, 0) > 4 * MiB)
      throw Error('Virtual resource budget exceeded');
    this.virtual = next;
  }
  async process(bytes, url, check) {
    const subtitlePlaylist = this.subtitlePlaylists.has(url);
    const prefix = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
    if (prefix.startsWith('#EXTM3U')) {
      bytes = new TextEncoder().encode(selectHLS(new TextDecoder().decode(bytes), this.options.streaming));
    } else {
      const prepared = prepareDASH(new TextDecoder().decode(bytes), url, this.options.streaming);
      bytes = prepared.bytes; if (prepared.url) url = prepared.url;
      this.store(prepared.resources);
    }
    check();
    if (bytes.byteLength > MiB) throw Error('Manifest size limit exceeded');
    const format = new TextDecoder().decode(bytes.subarray(0, 7)) === '#EXTM3U' ? 'hls' : 'dash';
    const policy = validateVODManifest(bytes, format, this.options.streaming);
    if (policy) {
      const additions = policy.subtitlePlaylists.map(uri => this.resolve(uri, url));
      if (new Set([...this.subtitlePlaylists, ...additions]).size > 16) throw Error('Subtitle track budget exceeded');
      for (const uri of additions) this.subtitlePlaylists.add(uri);
      if (subtitlePlaylist) {
        const parsed = subtitleSegments(new TextDecoder().decode(bytes), url);
        const parts = []; let total = 0;
        for (const segment of parsed.segments) {
          check();
          const body = await this.readAll(this.resolve(segment.url));
          check(); total += body.byteLength;
          if (total > MiB) throw Error('Subtitle window exceeds 1 MiB');
          parts.push({...segment, text: new TextDecoder('utf-8', {fatal: true}).decode(body)});
        }
        const subtitle = mergeWebVTT(parts), virtualURL = new URL(url);
        virtualURL.searchParams.set('__demuxe_subtitles', '1');
        const uri = virtualURL.href;
        this.store([[uri, new TextEncoder().encode(subtitle)]]);
        bytes = new TextEncoder().encode(`#EXTM3U\n#EXT-X-TARGETDURATION:${Math.ceil(parsed.duration)}\n#EXTINF:${parsed.duration},\n${uri}\n#EXT-X-ENDLIST\n`);
      }
    }
    check(); return {url, bytes};
  }
  close() {this.virtual.clear(); this.subtitlePlaylists.clear();}
}
