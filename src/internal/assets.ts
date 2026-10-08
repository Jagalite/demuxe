// SPDX-License-Identifier: Apache-2.0
/** This module performs no network I/O and is safe to import during SSR. */
export function runtimeBase(value?: string): URL {
  const base = value === undefined ? new URL('../../../', import.meta.url) : new URL(value.endsWith('/') ? value : value+'/', typeof document==='undefined'?undefined:document.baseURI);
  if (!['http:', 'https:'].includes(base.protocol) || base.search || base.hash || base.username || base.password) throw new Error('Invalid assetBase: use an HTTP(S) runtime directory without credentials, query or fragment');
  return base;
}
