// SPDX-License-Identifier: Apache-2.0
/** Conservative Safari duration workaround, not codec-support evidence.
 * WebKit's RemoteVideoDecoderCallbacks duration-map race was fixed on the
 * Safari branch after 26.5.2 shipped (WebKit commit 50232798d951).
 * Later WebKit versions contain the upstream fix; our WebKit 27.2 tests pass.
 * The first fixed shipping Safari release has not been verified. This workaround
 * intentionally targets older releases, not a permanent Safari restriction.
 * https://github.com/WebKit/WebKit/commit/50232798d951
 * Unknown UAs and newer releases still require normal runtime qualification.
 */
export function webCodecsDurationWorkaround(userAgent) {
    if (!/AppleWebKit\//.test(userAgent) || !/Safari\//.test(userAgent) || /Chrome\/|Chromium\/|CriOS\/|Edg[A-Za-z]*\/|OPR\/|FxiOS\/|Firefox\//.test(userAgent))
        return false;
    const match = /\bVersion\/(\d+)(?:\.(\d+))?(?:\.(\d+))?(?=\s|$)/.exec(userAgent);
    if (!match)
        return false;
    const major = Number(match[1]), minor = Number(match[2] ?? 0), patch = Number(match[3] ?? 0);
    return major > 0 && (major < 26 || major === 26 && (minor < 5 || minor === 5 && patch <= 2));
}
