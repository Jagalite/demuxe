# Optional player component

This is the target contract; qualification is recorded separately. Import
`definePlayerElement` from `deplexr/player` and call it once (repeat calls with the
same implementation are harmless). Core import does not import UI or register a
tag. SSR imports are safe; registration and construction require a browser.

`<deplexr-player controls asset-base="/assets/deplexr/" poster="/preview.jpg">`
creates one Player on connection. ready resolves with that core; player exposes it
read-only after initialization. open, close, destroy and playback conveniences
delegate to it. The component contains no route selector or playback scheduler.

src is a remote URL. Changing it cancels a previous pending source open; only the
latest accepted change wins. Removing src closes media. Programmatic open accepts
all core source types. autoplay requests play only after acceptance and reports
normal browser policy rejection without fallback. muted reflects configured mute;
controls toggles controls and closes open settings/stats overlays when disabled;
poster is an idle/loading preview. asset-base is fixed
after initialization and rejects changes. Set it before connection. Pre-upgrade
properties are replayed on upgrade. Boolean attributes follow HTML presence rules.

A microtask grace period preserves playback during synchronous DOM moves. Actual
removal aborts work and destroys the owned core; reconnect waits for that cleanup
before creating the next core. Explicit destroy is terminal, including reinsertion.
ready waits for connection; destroy before connection rejects it.

The open shadow root includes stage, controls, settings and status parts, CSS
public Deplexr theme variables, and before-controls /
after-controls slots. Labels can be overridden before or after connection.
Controls use semantic buttons/ranges/selects, visible focus, scoped keyboard
shortcuts, local drag preview, and an aria-live status that excludes time updates.
Settings restore focus on close. Fullscreen requests the component container in
the user gesture, keeping controls and subtitles together. PiP/casting are not
qualified. Loading, live windows and errors use core state only.

Forwarded core events are dispatched once with unchanged detail, bubbles:false;
listen directly on the element. No event-name aliases are generated. Component
lifecycle failures use error with a structured operation-scoped detail.

## Customization

```html
<deplexr-player
  controls
  title="Movie Night"
  asset-base="/assets/deplexr/">
</deplexr-player>
```

The standard HTML `title` property/attribute updates the displayed title live.
`titleMode` (also `title-mode`) has four policies:

* `auto` (default): a nonempty custom `title`, otherwise the accepted source
  filename, otherwise nothing.
* `custom`: only `title`; an empty string hides it.
* `source`: only the accepted source filename, even when a custom title exists.
* `none`: hide the title.

Local files use `File.name`. HTTP(S)/file URLs, including remote source
descriptors, use the decoded final pathname filename only. Origins, credentials,
query strings and fragments are excluded. Directory URLs, ArrayBuffers, opaque
URLs such as blob/data URLs, and unnamed sources show nothing. Source titles
track successful `element.open()` / `src` opens and clear when that source closes
or is replaced through the core; applications opening directly through
`element.player` should manage a custom title. Titles are plain text and truncate
visually to fit the player.

```ts
const element = document.querySelector("deplexr-player");
element.titleMode = "source";
```

For an embedded app, disable utility UI while retaining playback controls:

```ts
element.showSourceControls = false;
element.showDiagnostics = false;
element.allowFileDrop = false;
await element.open(source); // The host application owns source selection.
```

These three properties default to `true` and update live. Source controls include
the empty-state opener, folder menu, URL form and local media/subtitle pickers.
Disabling them closes their menu and disables the input handlers. Programmatic
`open()` and `addSubtitle()`, plus existing subtitle track selection, still work.
Disabling diagnostics closes its overlay; `element.player.diagnostics` remains
available. Disabling file drop leaves browser drag/drop defaults alone. Drop
handling is independent of source-control visibility: disable both when the host
owns all source input. Focus moves to the stage if a focused utility is disabled.
These options are JavaScript properties, not HTML boolean attributes.

`seekStep` defaults to 10 seconds and accepts a positive finite number. It
controls both seek buttons, their default accessible labels/numerals, and J/L.
Arrow keys retain their five-second steps. Explicit localized `labels.back` and
`labels.forward` override the default labels; keep them consistent with your step.
`controlsAutoHideDelay` defaults to 2800 milliseconds; zero disables inactivity
hiding, and positive values up to 2147483647 set the delay. Changing it restarts
the timer. Playing with the play button/shortcut still hides controls immediately;
screen taps still toggle visibility. Invalid numeric property values throw
`INVALID_ARGUMENT`.

For entirely custom controls, import `Player` from `deplexr` and build your own
layout. The optional component delegates to that same core and adds no playback
modes or routing policy.

```js
import {definePlayerElement} from 'deplexr/player';
definePlayerElement();
const element = document.querySelector('deplexr-player');
element.labels = {play: 'Lire', pause: 'Pause', settings: 'Réglages'};
const core = await element.ready;
const unsubscribe = core.subscribe(state => console.log(state.status));
await element.open(file, {signal: controller.signal});
// Later: await element.close() to reuse, or await element.destroy() to finish.
```

Methods also include play, pause, seek, setVolume, setMuted, setPlaybackRate,
selectAudioTrack, selectSubtitleTrack and addSubtitle. Advanced font, filter,
tone-mapping and source policy methods are available through the read-only player
reference. Replacing that reference is unsupported. Use a new element for a
new asset-base; the old one must finish cleanup first. An asset-base attribute
change after initialization is reverted and reports INVALID_ARGUMENT.

```css
deplexr-player {
  --deplexr-background: #121318;
  --deplexr-stage-background: #090a10;
  --deplexr-foreground: #f2f1f7;
  --deplexr-muted-foreground: #bbb8ca;
  --deplexr-panel-background: #20212a;
  --deplexr-control-background: #30313e;
  --deplexr-overlay-background: #171824bb;
  --deplexr-accent: #b7a0ff;
  --deplexr-border: #393941;
  --deplexr-radius: 16px;
}
deplexr-player::part(controls) { padding-inline: 20px; }
deplexr-player::part(title) { font-weight: 600; }
deplexr-player::part(timeline) { height: 32px; }
```

For a light skin, set the same surface variables to light colors, foregrounds to
dark colors, and `color-scheme: light` on the element for native form controls.
All public theme names use `--deplexr-*`; there are no legacy branding aliases.

Stable parts: container, stage, controls, settings, error, status, title, topbar,
transport, timeline, volume. The volume part wraps the mute button and slider. Limited slots:
before-controls, after-controls and source-actions. The source-actions slot adds
host-owned buttons to the source menu; activating a button closes the menu and
focuses the stage. The playground uses it for its example media. Shadow IDs/classes are implementation details.
Air controls overlay the video: an open-media action at the top, a large unboxed
play/pause icon between backward/forward seek buttons (ten seconds by default) at the center,
and a thin full-width timeline with elapsed and total times at opposite ends.
Seek buttons clamp to available seek ranges and disable while an operation is
pending or no seek window exists. Volume shares the timestamp row below the
timeline; settings and fullscreen sit at the top right. The gear opens compact playback settings; the folder opens file/URL
inputs and subtitle upload separately. The eye toggles a live session diagnostics
text overlay that remains visible when playback controls hide. The overlay is
scrollable and keyboard-focusable; navigation keys scroll it, and Escape closes
it and returns focus to the eye. Top-right icons
use motion on hover and a stronger accent stroke when active. Buffering displays
a small central ring even with hidden controls. Timeline shading uses reported
buffered ranges (currently Native only); unavailable ranges are not estimated.
Control sizes and compact layouts follow the player container width, including
small embeds in wide browser windows. Pointer controls retain 36px targets and
coarse-pointer devices use 44px targets. On narrow players, opening a menu hides
the central controls to avoid overlap. Play hides controls immediately; mouse
movement reveals them, and inactivity fades them out. Leaving the player with
the mouse also hides controls while playing (not while paused), unless a menu,
pending operation, timeline drag, or keyboard-visible focus needs them. Losing
focus alone does not hide controls; touch input keeps its existing tap behavior. Seeking with hidden
controls briefly shows only the timeline and times, for 800 ms after completion. Tapping the video toggles controls
in playing or paused playback. Clicking outside a menu dismisses it without
stealing focus; Escape returns focus to its trigger. Hiding controls preserves
focus on the stage; keyboard navigation reveals controls. Keyboard shortcuts apply to
focus inside the component; inputs keep their native keys, and buttons retain
Space/Enter activation, except top-right icons reserve Space for playback
and use Enter for activation. Playback keys: Space/K, arrows, J/L, M, C, brackets, digits,
Home/End, F and ?. Inputs, selects, editable content and modified keys
retain their normal handling. C uses the core's subtitle visibility setting;
it does not select a different language. Scrubbing previews locally; release
commits one seek. Settings are an accessible disclosure and restore trigger focus.

Local file/subtitle pickers are available in settings; opening files never uploads
them. File drop and a URL form (File, HLS, DASH, and live input)
are also built into the component. File selection, URL submission, and file drop
focus the stage so Space controls playback; the public close() method closes media. The component contains no example media, engine selector,
raw filters or memory metrics. The playground keeps automatic engine selection
enabled and shows a compact engine/media summary below the player. A live stream with no known seek window shows LIVE
and disables the finite seek control. Browser fullscreen denial produces a message;
no fake fullscreen, PiP or casting fallback is applied.
