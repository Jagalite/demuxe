// SPDX-License-Identifier: Apache-2.0
// Mirror only the arrow so both directions retain upright, centered numerals.
const seekArrow = '<path d="M10 5h2a8 8 0 1 1-8 8M13 2l-3 3 3 3"/>';
const seekSeconds = '<text x="12" y="16" text-anchor="middle" fill="currentColor" stroke="none" font-size="8.5" font-weight="450" font-family="system-ui,sans-serif">10</text>';
export const icons = {
  previous:'<path d="M5 5v14m14-14L8 12l11 7Z" fill="currentColor"/>',
  next:'<path d="M19 5v14M5 5l11 7-11 7Z" fill="currentColor"/>',
  eyeOff:'<path d="m3 3 18 18M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3.2 4.1M6.1 6.1A19 19 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.1-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  back:`${seekArrow}${seekSeconds}`,
  forward:`<g transform="translate(24 0) scale(-1 1)">${seekArrow}</g>${seekSeconds}`,
  play:'<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  volume:'<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted:'<path d="m11 5-6 4H2v6h3l6 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  settings:'<path d="M9 3h6l.6 2.3 2 1.2 2.3-.6 3 5.2-1.7 1.7v2.4l1.7 1.7-3 5.2-2.3-.6-2 1.2L15 24H9l-.6-2.3-2-1.2-2.3.6-3-5.2 1.7-1.7v-2.4L1.1 11l3-5.2 2.3.6 2-1.2Z" transform="translate(1 0) scale(.9)"/><circle cx="12" cy="12" r="3"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  collapse:'<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>',
  folder:'<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/>',
  folderOpen:'<path d="M3 8V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v2M3 8h17a1 1 0 0 1 1 1l-2 10H3L1 9a1 1 0 0 1 1-1Z"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>'
} as const;
