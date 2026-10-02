// SPDX-License-Identifier: Apache-2.0
export function createPreparation() { return Object.freeze({ retired: false, jobs: Object.freeze([]) }); }
export function preparationEngine(name, environment) {
    const cooperative = environment.runtime !== 'pthread' && (!environment.providerAssets || environment.privatePlayback);
    const software = cooperative ? 'engine-mpv-playback-' + environment.runtime : environment.software;
    return name === 'inspector' || name === 'engine-remux' ? 'engine-remux' + (environment.runtime === 'pthread' ? '' : '-' + environment.runtime)
        : name === 'hybrid' || name === 'engine-hybrid' ? cooperative ? software : 'engine-hybrid'
            : name === 'software' || name === 'font' || name === 'engine-software-full' || name === 'engine-software-yuv' ? software : name;
}
export function admitPreparation(state, components, environment, now) {
    const names = [...new Set(components)];
    if (names.some(name => name === 'hybrid' || name === 'software'))
        names.push('font');
    if (state.retired)
        return Object.freeze({ state, names: Object.freeze(names), start: Object.freeze([]), aborted: Object.freeze(names.map(name => Object.freeze({ name, status: 'aborted', bytes: 0, milliseconds: 0 }))) });
    const start = names.filter(name => !state.jobs.some(job => job.name === name));
    const jobs = start.map(name => {
        const engine = preparationEngine(name, environment), cooperative = environment.runtime !== 'pthread' && (!environment.providerAssets || environment.privatePlayback);
        return Object.freeze({ name, engine, path: name === 'font' ? 'fixtures/DejaVuSans.ttf' : `web/${engine}/${name === 'inspector' ? 'remux' : 'player'}.wasm`,
            isolated: environment.isolated || (name === 'inspector' ? environment.runtime !== 'pthread' : cooperative), providerAssets: environment.providerAssets,
            limit: (name === 'font' ? 8 : 32) * 1024 * 1024, bytes: 0, started: now, deadline: now + 15000, cancelled: state.retired, status: 'pending', phase: 'queued' });
    });
    return Object.freeze({ state: Object.freeze({ ...state, jobs: Object.freeze([...state.jobs, ...jobs]) }), names: Object.freeze(names), start: Object.freeze(start), aborted: null });
}
export function stepPreparation(state, name, event) {
    const job = state.jobs.find(job => job.name === name);
    const done = (next, effect) => Object.freeze({ state: next, effect });
    if (!job || job.status !== 'pending')
        return done(state, 'ignore');
    if (event.kind === 'deadline' && (job.cancelled || state.retired || event.now < job.deadline))
        return done(state, 'ignore');
    if (event.kind === 'phase' && state.retired)
        return done(state, 'ignore');
    const bytes = event.kind === 'bytes' ? (event.declared ? event.bytes : job.bytes + event.bytes) : job.bytes;
    if (event.kind === 'bytes' && !job.providerAssets && bytes > job.limit)
        return done(event.declared ? state : Object.freeze({ ...state, jobs: Object.freeze(state.jobs.map(item => item.name === name ? Object.freeze({ ...item, bytes }) : item)) }), 'overflow');
    const next = Object.freeze({ ...state, jobs: Object.freeze(state.jobs.map(item => item.name === name ? Object.freeze({ ...item,
            bytes: event.kind === 'bytes' && !event.declared ? bytes : item.bytes, cancelled: event.kind === 'deadline' || item.cancelled,
            phase: event.kind === 'phase' ? event.phase : item.phase }) : item)) });
    return done(next, event.kind === 'phase' ? 'notify' : event.kind === 'deadline' ? 'abort' : 'accepted');
}
export function completePreparation(state, name, now, error) {
    const job = state.jobs.find(job => job.name === name);
    if (job.status !== 'pending')
        return Object.freeze({ state, asset: preparationAsset(state, name), publish: false, notify: false });
    const status = state.retired || job.cancelled ? 'aborted' : error === undefined ? 'ready' : 'failed';
    const next = Object.freeze({ ...state, jobs: Object.freeze(state.jobs.map(item => item.name === name ? Object.freeze({ ...item, status, finished: now, error, phase: state.retired ? item.phase : status }) : item)) });
    return Object.freeze({ state: next, asset: preparationAsset(next, name), publish: status === 'ready', notify: !state.retired });
}
export function preparationAsset(state, name) {
    const job = state.jobs.find(job => job.name === name);
    return Object.freeze({ name, status: state.retired || job.cancelled ? 'aborted' : job.status === 'pending' ? 'aborted' : job.status, bytes: job.bytes, milliseconds: (job.finished ?? job.started) - job.started, ...(job.error === undefined ? {} : { error: job.error }) });
}
export function retirePreparation(state) { return state.retired ? state : Object.freeze({ ...state, retired: true }); }
export function preparationProgress(state) { return state.jobs.map(job => ({ name: job.name, status: job.phase })); }
