// SPDX-License-Identifier: Apache-2.0
/** Per-player, bounded cache of exact API inputs. No source outcomes are cached.
 * Predictions never prove output, change fidelity, or veto a working file route. */
export class MediaCapabilityQueries {
    decode;
    timeoutMs;
    onLateAnswer;
    cache = new Map();
    tokens = new Map();
    lateAnswers = new Map();
    evidence = new Map();
    key(capability, probe) { return JSON.stringify([capability.api, capability.tracks, capability.queries, probe.tracks]); }
    cached(capability, probe) { return this.evidence.get(this.key(capability, probe)); }
    constructor(decode, timeoutMs = 150, onLateAnswer) {
        this.decode = decode;
        this.timeoutMs = timeoutMs;
        this.onLateAnswer = onLateAnswer;
    }
    async inspect(capability, probe) {
        const result = { api: 'decodingInfo', queries: [], unqueriedTracks: [], scope: 'advisory' };
        const type = capability.api === 'canPlayType' ? 'file' : 'media-source';
        const configurations = [];
        const prepared = capability.api === 'isTypeSupported';
        const rejectedContainers = new Set(capability.queries.filter(q => q.result === false).map(q => q.mime.split(';')[0]));
        for (const track of capability.tracks) {
            const source = probe.tracks.find(t => t.index === track.index);
            // Adaptation changes the encoding and may change rate/layout. Source bitrate
            // and codec parameters are not the output configuration.
            if (!source || track.adapted) {
                result.unqueriedTracks.push(track.index);
                continue;
            }
            const matches = capability.queries.filter(q => (track.codecString ? q.mime.includes(`codecs="${track.codecString}"`) : !q.mime.includes('codecs=')) && (!prepared || !rejectedContainers.has(q.mime.split(';')[0])));
            const alternatives = prepared ? matches : matches.slice().sort((a, b) => Number(b.result === 'probably') - Number(a.result === 'probably')).slice(0, 1);
            let queried = false;
            for (const { mime } of alternatives) {
                const configuration = { type };
                if (track.type === 'audio') {
                    configuration.audio = { contentType: mime.replace(/^video\//, 'audio/'), ...(source.channels ? { channels: String(source.channels) } : {}), ...(source.sampleRate ? { samplerate: source.sampleRate } : {}), ...(source.bitrate ? { bitrate: source.bitrate } : {}) };
                }
                else if (track.type === 'video' && source.width && source.height && source.bitrate && source.framerate) {
                    configuration.video = { contentType: mime, width: source.width, height: source.height, bitrate: source.bitrate, framerate: source.framerate };
                }
                else
                    continue;
                configurations.push({ track: track.index, configuration, container: mime.split(';')[0] });
                queried = true;
            }
            if (!queried)
                result.unqueriedTracks.push(track.index);
        }
        result.queries = await Promise.all(configurations.map(async ({ track, configuration, container }) => {
            const key = JSON.stringify(configuration);
            let pending = this.cache.get(key);
            if (!pending) {
                const token = Symbol();
                this.tokens.set(key, token);
                pending = this.query(configuration, answer => {
                    if (this.tokens.get(key) !== token)
                        return;
                    this.cache.set(key, Promise.resolve(answer));
                    this.lateAnswers.set(key, answer);
                    for (const [evidenceKey, evidence] of this.evidence) {
                        if (evidence.queries.some(q => JSON.stringify(q.configuration) === key))
                            this.evidence.set(evidenceKey, { ...evidence, queries: evidence.queries.map(q => JSON.stringify(q.configuration) === key ? { ...q, ...answer } : q) });
                    }
                    this.onLateAnswer?.();
                });
                this.cache.set(key, pending);
                if (this.cache.size > 128) {
                    const oldest = this.cache.keys().next().value;
                    this.cache.delete(oldest);
                    this.tokens.delete(oldest);
                    this.lateAnswers.delete(oldest);
                }
            }
            return { track, configuration, container, ...await pending };
        }));
        // A track may answer late while another track is still pending. Publish the
        // latest evidence atomically, rather than overwriting it with a raced timeout.
        result.queries = result.queries.map(q => ({ ...q, ...this.lateAnswers.get(JSON.stringify(q.configuration)) }));
        if (result.unqueriedTracks.length)
            result.reason = 'Exact source/output metadata or viable packaging unavailable for some tracks; no adaptation parameters, frame rate or bitrate are guessed';
        this.evidence.set(this.key(capability, probe), result);
        if (this.evidence.size > 128)
            this.evidence.delete(this.evidence.keys().next().value);
        return result;
    }
    async query(configuration, onLate) {
        if (!this.decode)
            return { status: 'unavailable', reason: 'MediaCapabilities.decodingInfo is unavailable' };
        let timer, timedOut = false;
        try {
            return await Promise.race([
                Promise.resolve().then(() => this.decode(configuration)).then(info => { const answer = { status: 'answered', supported: info.supported, smooth: info.smooth, powerEfficient: info.powerEfficient, ...(timedOut ? { late: true } : {}) }; if (timedOut)
                    onLate(answer); return answer; }),
                new Promise(resolve => { timer = setTimeout(() => { timedOut = true; resolve({ status: 'timeout', reason: 'MediaCapabilities query deadline exceeded' }); }, this.timeoutMs); })
            ]);
        }
        catch (error) {
            return { status: 'error', reason: String(error) };
        }
        finally {
            clearTimeout(timer);
        }
    }
}
