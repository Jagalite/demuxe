/** Maintained packet compositions, separate from ordered playback policy.
 * They are usable only with composition evidence for the exact source envelope,
 * browser, implementation set and ABI. No package may extend this table. */
const read = { capability: 'container.read.matroska', version: 1, profile: 'finite-clear-av' };
const mux = { capability: 'container.mux.fmp4', version: 1, profile: 'explicit-timeline-av' };
const encode = { capability: 'audio.encode.flac', version: 1, profile: '48khz-s24' };
const decode = {
    ac3: { capability: 'audio.decode.ac3', version: 1, profile: '48khz-fltp' },
    eac3: { capability: 'audio.decode.eac3', version: 1, profile: '48khz-fltp' },
    'dts-core': { capability: 'audio.decode.dts', version: 1, profile: 'core-48khz-fltp' },
    truehd: { capability: 'audio.decode.truehd', version: 1, profile: '48khz-integer' },
    mlp: { capability: 'audio.decode.mlp', version: 1, profile: '48khz-integer' },
    'dts-hd': { capability: 'audio.decode.dts', version: 1, profile: 'ma-48khz-s32p' },
};
export function audioRepairRecipe(codec, channels = 2) {
    if (!Object.prototype.hasOwnProperty.call(decode, codec))
        throw Error('No maintained audio repair recipe');
    const integer = ['truehd', 'mlp', 'dts-hd'].includes(codec);
    if (!(codec === 'truehd' ? [2, 6, 8] : codec === 'mlp' ? [2, 6] : codec === 'dts-hd' ? [8] : [2]).includes(channels))
        throw Error('No maintained audio channel recipe');
    const decoding = decode[codec];
    const decoderId = codec === 'dts-core' ? 'audio-dts' : codec === 'dts-hd' ? 'audio-dts-hd' : integer ? 'audio-truehd-mlp' : 'audio-ac3';
    return { id: 'matroska-flac24-' + (channels === 2 ? 'stereo48' : channels + 'ch48') + '-' + codec, requirements: [read, mux, decoding, encode], bindings: [
            { id: 'fine', assignments: [{ providerId: 'ts-container', requirements: [read, mux] },
                    { providerId: decoderId, requirements: [decoding] },
                    { providerId: 'audio-flac', requirements: [encode] }] },
            ...(!integer ? [{ id: 'common', assignments: [{ providerId: 'ts-container', requirements: [read, mux] },
                        { providerId: 'audio-common', requirements: [decoding, encode] }] }] : []),
        ] };
}
export function packetCopyRecipe() {
    return { id: 'matroska-avc-hevc-aac-copy', requirements: [read, mux], bindings: [{ id: 'typescript', assignments: [{ providerId: 'ts-container', requirements: [read, mux] }] }] };
}
