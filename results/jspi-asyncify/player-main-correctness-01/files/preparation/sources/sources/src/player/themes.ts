// SPDX-License-Identifier: Apache-2.0
export const themeStyles = `
/* Theme defaults live on the host; consumer host declarations win across shadow DOM. */
:host{--demuxe-background:#101114;--demuxe-foreground:#f6f3ed;--demuxe-accent:#f3ead8;--demuxe-border:#ffffff24;--demuxe-radius:14px;--demuxe-stage-background:#08090c;--demuxe-muted-foreground:#b8bbc3;--demuxe-panel-background:#151619;--demuxe-control-background:#25262b;--demuxe-overlay-background:#30343b70;--demuxe-color-scheme:dark;--demuxe-font:14px/1.5 system-ui,sans-serif;--demuxe-control-radius:8px;--demuxe-motion-ease:cubic-bezier(.22,1,.36,1);font:var(--demuxe-font);--motion-ease:var(--demuxe-motion-ease)}
:host([theme=light]){--demuxe-background:#f4f3ee;--demuxe-foreground:#1c2529;--demuxe-muted-foreground:#4d5a60;--demuxe-accent:#006b61;--demuxe-border:#23343a30;--demuxe-panel-background:#faf9f5;--demuxe-control-background:#e4e8e3;--demuxe-overlay-background:#f4f3eef5;--demuxe-color-scheme:light}
button{border-radius:var(--demuxe-control-radius)}
:host([theme=light]) .controls,:host([theme=light]) .topbar{background:var(--demuxe-overlay-background)}
:host([theme=light]) .time,:host([theme=light]) .diagnostics-overlay{text-shadow:none}
:host([theme=light]) .icon-button svg{filter:none}
:host([theme=light]) .transport{background:var(--demuxe-overlay-background);border-radius:var(--demuxe-radius);padding:8px}
`;
