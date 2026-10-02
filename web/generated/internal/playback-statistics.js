import { createPlaybackStatistics, playbackStatisticsClockReads, selectPlaybackStatistics, transitionPlaybackStatistics } from './machine/telemetry.js';
/** Bounded, source-scoped observations; no backend counter inference. */
export class PlaybackStatistics {
    now;
    state = createPlaybackStatistics();
    constructor(now = () => performance.now()) {
        this.now = now;
    }
    timestamps(command) {
        return Array.from({ length: playbackStatisticsClockReads(this.state, command) }, () => this.now());
    }
    apply(command) {
        this.state = transitionPlaybackStatistics(this.state, { ...command, timestamps: this.timestamps(command) });
    }
    clear() { this.apply({ kind: 'clear' }); }
    accept(sourceId, preserve, elapsed) { this.apply({ kind: 'accept', sourceId, preserve, elapsed }); }
    seek(milliseconds) { this.apply({ kind: 'seek', milliseconds }); }
    observe(state) { this.apply({ kind: 'observe', observation: { sourceId: state.sourceId, status: state.status, playbackIntent: state.playbackIntent, operationPending: !!state.pendingOperation } }); }
    snapshot() { return selectPlaybackStatistics(this.state, this.timestamps({ kind: 'snapshot' })[0]); }
}
