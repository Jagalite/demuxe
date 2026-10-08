// SPDX-License-Identifier: Apache-2.0
/** Public text intentionally omits all URL queries, fragments and userinfo. */
export function redact(value) {
    if (typeof value === 'string')
        return value.replace(/https?:\/\/[^\s<>"']+/gi, text => {
            try {
                const u = new URL(text);
                return u.origin + u.pathname + (u.search || u.hash ? '?[redacted]' : '');
            }
            catch {
                return '[redacted URL]';
            }
        }).replace(/\b(authorization|proxy-authorization|cookie|set-cookie|x-api-key)\s*[:=]\s*[^\r\n]+/gi, '$1: [redacted]').replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, '$1 [redacted]');
    if (Array.isArray(value))
        return value.map(redact);
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, /authorization|cookie|token|secret|password|headers/i.test(key) ? '[redacted]' : redact(v)]));
    return value;
}
export class PlayerError extends Error {
    code;
    operationId;
    operation;
    scope;
    retryable;
    constructor(code, message, operationId = null, operation = null, scope = 'operation', retryable = false) {
        super(redact(message));
        this.code = code;
        this.operationId = operationId;
        this.operation = operation;
        this.scope = scope;
        this.retryable = retryable;
        this.name = 'PlayerError';
    }
    toJSON() { return { code: this.code, message: this.message, operationId: this.operationId, operation: this.operation, scope: this.scope, retryable: this.retryable }; }
}
// A bundled core and a deployment-loaded provider have distinct constructors.
// Keep the typed error contract across that boundary without trusting arbitrary
// objects that merely contain a `code` string. The marker is not a security
// credential and does not cross worker serialization; workers retain their
// existing explicit message-to-error conversion.
const playerErrorBrand = Symbol.for('demuxe.internal.PlayerError.v1');
Object.defineProperty(PlayerError.prototype, playerErrorBrand, { value: true });
const errorCodes = {
    DEPLOYMENT_UNAVAILABLE: true, INVALID_ARGUMENT: true, ABORTED: true,
    AUTOPLAY_BLOCKED: true, SOURCE_PERMISSION: true, SOURCE_CHANGED: true,
    NETWORK_TIMEOUT: true, PLAYBACK_STALLED: true, UNSUPPORTED_MEDIA: true,
    UNSUPPORTED_TIMELINE: true, UNSUPPORTED_FEATURE: true, ASSET_LOAD_FAILED: true,
    ISOLATION_REQUIRED: true, DECODE_FAILED: true,
};
export function isPlayerError(error) {
    if (error instanceof PlayerError)
        return true;
    return error instanceof Error && error.name === 'PlayerError'
        && error[playerErrorBrand] === true
        && 'code' in error && typeof error.code === 'string' && Object.hasOwn(errorCodes, error.code);
}
// Worker transports may append a browser stack to the message. Stack function
// names and asset URLs are diagnostic text, not evidence of a timeout or asset
// failure. Inspect semantic message lines and explicit causes instead.
function classificationFacts(error) {
    const messages = [], names = [], seen = new Set();
    let current = error, typed, timeline = false;
    for (let depth = 0; depth < 8; depth++) {
        if (current instanceof Error) {
            if (seen.has(current))
                break;
            seen.add(current);
        }
        const text = current instanceof Error ? current.message : String(current);
        const lines = text.split(/\r?\n/), semantic = [];
        for (const line of lines) {
            if (/^\s*at\s+/.test(line) || /^[^\n]*@(?:[a-z][a-z0-9+.-]*:|debugger eval code:)/i.test(line))
                break;
            semantic.push(line);
        }
        messages.push(semantic.join('\n'));
        if (!(current instanceof Error))
            break;
        names.push(current.name);
        if (isPlayerError(current))
            typed ??= current;
        if ('code' in current && current.code === 'UNSUPPORTED_TIMELINE')
            timeline = true;
        if (!('cause' in current) || current.cause === undefined)
            break;
        current = current.cause;
    }
    return { message: messages.join('\n'), names, typed, timeline };
}
export function playerError(error, id = null, operation = null, scope = 'operation') {
    if (isPlayerError(error))
        return new PlayerError(error.code, error.message, id ?? error.operationId, operation ?? error.operation, scope, error.retryable);
    if (error instanceof Error && 'code' in error && error.code === 'UNSUPPORTED_TIMELINE')
        return new PlayerError('UNSUPPORTED_TIMELINE', error.message, id, operation, scope);
    const message = error instanceof Error ? error.message : String(error);
    const facts = classificationFacts(error), semantic = facts.message;
    if (facts.typed)
        return new PlayerError(facts.typed.code, message, id ?? facts.typed.operationId, operation ?? facts.typed.operation, scope, facts.typed.retryable);
    const code = facts.timeline ? 'UNSUPPORTED_TIMELINE'
        // Keep the public network-budget category for exhausted attempts, including
        // per-attempt AbortError causes; the message distinguishes limit vs time.
        : /^(?:Error:\s*)?Media read retry (?:limit|deadline) exceeded\b/im.test(semantic) ? 'NETWORK_TIMEOUT'
            : facts.names.includes('AbortError') || /^(?:Operation aborted|Open aborted|Player (?:element )?(?:is )?destroyed|Player element disconnected)|cancelled/im.test(semantic) ? 'ABORTED'
                : facts.names.includes('NotAllowedError') || /autoplay|user gesture|audio context.*suspended/i.test(semantic) ? 'AUTOPLAY_BLOCKED'
                    : /cross.origin isolat|secure.*isolated/i.test(semantic) ? 'ISOLATION_REQUIRED'
                        : /representation changed|changed length|Source changed/i.test(semantic) ? 'SOURCE_CHANGED'
                            : /\b(?:401|403)\b|permission|origin.*not allowed|authorization/i.test(semantic) ? 'SOURCE_PERMISSION'
                                // This deadline belongs to retained decoder ownership, not source I/O.
                                // Keep generic native command/output and transport deadlines unchanged.
                                : /^(?:Error:\s*)?(?:Retained decoder:\s*(?:Error:\s*)?)?Retained decoder request deadline exceeded\s*$/im.test(semantic) ? 'DECODE_FAILED'
                                    : /timed? ?out|deadline/i.test(semantic) ? 'NETWORK_TIMEOUT'
                                        : /fetch.*module|load.*font|\.wasm|initialization|worker.*failed|import.*module|Aborted\(.*fetch|wasm.*failed|WebAssembly.*(?:compile|instantiate)/i.test(semantic) ? 'ASSET_LOAD_FAILED'
                                            : /Invalid|Expected|must be|limited to|queue.*full|No source/i.test(semantic) ? 'INVALID_ARGUMENT'
                                                : /preserve.*track|unknown.*track|require.*mode|unsupported.*feature|not supported.*source|filters require|cannot.*discard|external.*require/i.test(semantic) ? 'UNSUPPORTED_FEATURE'
                                                    : /unsupported|no playback route|no browser bridge/i.test(semantic) ? 'UNSUPPORTED_MEDIA' : 'DECODE_FAILED';
    return new PlayerError(code, message, id, operation, scope, ['NETWORK_TIMEOUT', 'ASSET_LOAD_FAILED', 'AUTOPLAY_BLOCKED'].includes(code));
}
