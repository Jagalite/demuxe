<!-- SPDX-License-Identifier: Apache-2.0 -->
# Player presentation architecture

## Behavioral inventory and migration map

Inventory taken from `src/player/index.ts`, `interaction.ts`, `preview.ts`, `styles.ts`, the playground, and component tests before changing presentation. Every row applies to all built-in layouts unless stated otherwise.

| Existing behavior | Owner after refactor |
| --- | --- |
| One owned Player per connected element; ready promise; explicit registration; SSR-safe import; reconnect/destroy race protection; event forwarding | Element controller, unchanged; layout never touches the media host |
| Canonical immutable state, actions, capabilities, pending operations, routing, track policy | Core Player / public contracts; independent of all UI imports |
| `controls` hides chrome; absent source hides transport/timeline; poster and file opener while empty | Shared controller + component nodes |
| Pointer movement reveals; mouse leave hides during uncomplicated playback; screen click/touch toggles chrome rather than playback; double-click stage fullscreen | Shared interaction controller |
| Play button immediately hides chrome; playing timeout defaults 2800ms; zero disables timeout; menus, drag, pending operation and visible keyboard focus prevent timeout | Shared visibility controller |
| Hidden-control seek briefly exposes timeline and time only for 800ms; focus/Tab reveals controls; pause/end/error reveal according to existing state transition rules | Shared visibility controller and layout visibility rules |
| Play icon follows intent, not transient buffering state; play/seek disabled for pending operations; buffering spinner independent of chrome | Transport, loading indicator, controller |
| Opening inspector/read/backend startup phases; preparation loading/compiling counts distinct from playback readiness; completed preparation pill while empty | Loading indicator, canonical events |
| Errors, retryable-only Retry, autoplay-blocked Play, ignored aborts; last source retry; polite deduplicated announcements | Error and status overlays |
| Scrub input gives local time/progress without seeking until change; cancel restores canonical state; updates do not overwrite active drag | SeekBar |
| Seekable window min/max, live moving window, no-window disabled seeking; buffered/cached ranges clipped into window; jumps constrained to available ranges | SeekBar + canonical state/actions |
| Current time floors/clamps; hours when needed; LIVE/unknown duration; no timeline before source; chrome hides timing while idle except seek pulse | TimeDisplay; layout must not manufacture duration/seekability |
| Pointer hover thumbnails, no touch previews; opt-out checkbox/attribute; one active request and latest waiting hover; separate image decoding; preserve last image until ready; approximate actual-time label; abort/revoke on hide/source/mode/destroy | Existing ScrubberPreview bound once to stable SeekBar nodes |
| Volume slider commits on change, previews fill during input, avoids overwriting focused slider; mute state/label reflected in attribute | VolumeControl + controller |
| Fullscreen targets entire custom element; Escape/browser change updates icon; stage double-click and F; unavailable announcement | FullscreenButton + public presentation API |
| Settings/source panels mutually exclusive; outside pointer dismissal, Escape restores trigger, open focuses Close; native selects and checkboxes, scrolling panels | SettingsPanel, TrackSelector, PlaybackRateSelector |
| Audio/subtitle labels, selected/auto/off entries, disabled empty/locked selectors, policy limits external subtitles and C shortcut | Shared TrackSelector + core enforcement |
| Rates .5/.75/1/1.25/1.5/1.75/2; bracket shortcuts clamp .5–2 | PlaybackRateSelector |
| K/Space play; arrows ±5s, J/L configurable step; up/down ±5% volume; M mute; C subtitle visibility; brackets rate; digits/Home/End window position; F fullscreen; ? settings | Shared shortcuts; editable/slider/composition/modifier exclusions; repeated toggle suppression |
| Space on utility buttons drives playback; Enter activates them; settings inputs retain native keyboard behavior; diagnostics Escape restores trigger | Shared keyboard controller independent of utility placement |
| Files, multiple-file queue, drag/drop (separately configurable), URL file/HLS/DASH/live form, subtitle file input; reset input permits same file again | SourcePanel + element source/queue controller |
| Queue add/remove/clear/previous/next; paused intent preserved; once-only EOF advance; operation disabling; supersession/rollback; external core source replacement releases UI queue | Existing single queue owner, never in layouts |
| Source title filenames only, no URL credentials/query/fragment; custom/auto/source/none policies; configurable labels and pre-upgrade properties | Shared title/source components + controller |
| Diagnostics toggle: engine auto/manual, state/pending/time/rate/codecs/dimensions/volume; recorded rejected routes and backend scalar data; 500ms throttle | Status/Diagnostics overlay, public diagnostics API |
| Source and diagnostics permission-like visibility flags restore focus and block handlers; controls-independent programmatic open; consumer source-actions/before-controls/after-controls slots | Controller + stable slots/parts |
| Container-width responsiveness, media aspect ratio/output dimensions, whole-player fullscreen, coarse-pointer targets | Layout CSS + unchanged geometry controller |
| Native labeled sliders/selects/buttons, pressed/expanded/current state, polite live region, visible focus, reduced motion, forced colors, scrollable diagnostics | Shared semantic markup and shared accessibility styles |

Absent in the original UI: PiP button, video track selector, adaptive quality selector, route-selection menu, chapter/loop UI, touch gestures beyond screen-tap visibility/native sliders, focus trap, and dedicated screen-reader shortcut help. These are not fabricated as existing behavior. Public core APIs remain available for these Demuxe capabilities. The presentation refactor does not change route admission or qualify new playback paths.

## Coupling found and chosen design

The element mixed template strings, icons, CSS, source ownership, event binding, state rendering and lifecycle. CSS accumulated successive positioning overrides. Its public Player already provides a UI-independent state/action API; introducing a second playback store would duplicate authority.

The new boundary is intentionally small:

- **Behavior:** the element remains the lifecycle/source/queue/interaction controller using public Player contracts. Existing preview cancellation remains its own component controller. Consumers can use `Player`, `PlaybackControl`, `subscribeSelector` and `bindPlayer` without importing the element.
- **Components:** named markup factories compose the shell once. Live nodes and their event handlers are retained for the lifetime of that shell. Shared transport, seek bar, time/volume, utility actions, panels and overlays have stable IDs/parts.
- **Layouts:** `classic` retains the existing center transport/top utilities. `modern` composes the same transport and utilities into a bottom control dock, with a quieter title bar and container-driven wrapping. `playground` brings the original Pages demo’s framed header and below-video transport strip to the current engine. Its controls remain visible during playback because they sit outside the picture. The media stage is never moved. Layouts contain no playback calls or subscriptions.
- **Themes:** `demuxe` preserves the warm dark baseline; `light` supplies a contrasting light chrome palette. Theme tokens work with every layout. Modern controls and the light theme use background surfaces for legibility over footage; classic Demuxe retains its original overlays. Consumer host custom properties and shadow parts override defaults.

The shared settings panel also exposes labeled Layout and Theme selectors. Runtime property/attribute switches are synchronous and do not open/close/pause/seek media. They preserve core identity, source, position, routing, queue, track selection, and component nodes. Focus is restored after reparenting. Theme changes never reparent nodes. With no source, modern keeps utility actions in the header so source opening and settings remain available. Layout changes dismiss stale thumbnail geometry but keep the preview service. No render callback receives the engine's host, and no layout registry or duplicate state framework is introduced.

## Module map

| Module | Responsibility |
| --- | --- |
| `src/player/index.ts` | Element lifecycle, source/queue ownership, one shared state renderer and action bindings |
| `src/player/components.ts` | Semantic component factories, composed once; no playback calls |
| `src/player/presentation.ts` | Persistent-node composition, layout types, modern positioning and responsive rules |
| `src/player/themes.ts` | Theme defaults and palette-specific legibility rules |
| `src/player/styles.ts` | Shared component styling and preserved classic geometry/visibility baseline |
| `src/player/icons.ts` | Shared icon family |
| `src/player/interaction.ts`, `preview.ts` | Existing keyboard helpers and bounded thumbnail presentation |

The classic stylesheet is retained as the compatibility baseline rather than rewritten wholesale. New layout positioning belongs in the presentation layer, and new palettes belong in themes. No new package dependency, engine adapter, per-layout state store, renderer registry or service locator is needed.

## Usage and extension contract

```html
<demuxe-player controls layout="classic" theme="demuxe"></demuxe-player>
```

```js
viewer.layout = 'modern';
viewer.theme = 'light';
// These affect presentation only. The existing player is retained.
const core = await viewer.ready;
const unsubscribe = core.subscribe(state => { /* render a completely custom UI */ });
await core.seek(30);
```

Invalid property values throw `INVALID_ARGUMENT`; invalid attribute values fall back to defaults. Defaults are `classic` / `demuxe`. No core Player constructor option is added: UI configuration belongs to the UI element.

Use host CSS variables (`--demuxe-background`, `--demuxe-foreground`, `--demuxe-muted-foreground`, `--demuxe-accent`, `--demuxe-border`, `--demuxe-radius`, `--demuxe-stage-background`, `--demuxe-panel-background`, `--demuxe-control-background`, `--demuxe-overlay-background`, `--demuxe-font`, `--demuxe-color-scheme`, `--demuxe-control-radius`, `--demuxe-motion-ease`) and `::part()` for consumer styling. Existing parts and slots remain supported. New parts expose transport buttons, utility actions, current-time/duration, rate/audio/subtitles selectors and the modern time-display group. Icons inherit currentColor and can be styled through button parts; replacing the icon family can be done by a custom UI, without replacing playback.

For consumer controls use the existing slots and public contracts; for completely custom layouts use `Player` with an application-owned host and `bindPlayer`/`subscribeSelector` from `demuxe/integration`. Arbitrary runtime layout plugins are intentionally not a new public API. Built-in composition is a small internal extension point: add a layout using the shared nodes and test the migration table above. Do not clone controls or recreate the media surface.

Settings are nonmodal labeled regions with native form controls, not ARIA menus (which would require a different keyboard model). They deliberately do not trap focus. Tab focus reveals hidden chrome. New layouts must retain this and provide space for future capability-aware Demuxe controls. Browser semantic/keyboard checks are not a physical screen-reader audit.

## Validation scope

`npm run test:presentation` exercises the layout/theme matrix, persistent node/core/state identity, advancing playback, focus, editable settings, empty-state source access, idle seek feedback, previews, queues, locked tracks, fullscreen, host token overrides and teardown. It captures desktop and 400px embedded screenshots. Run with `BROWSER=firefox` for Firefox. The existing component and preview suites remain the broader behavioral regression reference.

This validates UI composition against the maintained H.264/AAC fixture; it does not newly qualify codecs, playback routes, physical touch devices or screen readers. Two legacy playground tests now explicitly pause before clicking Play: the playground has autoplay enabled, so assuming an initially paused source made those checks time out.

### Implementation verification (2026-09-27)

| Suite | Result | Evidence |
| --- | --- | --- |
| Classic component suite | 50/50 passed | [Report](../results/player-component/chrome-2026-09-27T17-22-46.454Z/result.json) |
| Presentation / Chrome | 17/17 passed | [Report](../results/player-presentation/chrome-2026-09-27T17-25-16.895Z/result.json) |
| Presentation / Firefox | 17/17 passed | [Report](../results/player-presentation/firefox-2026-09-27T17-25-16.863Z/result.json) |

The existing `node tests/preview-ui.mjs` suite passed. TypeScript and the standard build/license/core-boundary checks passed. Desktop, 400px, light/dark and forced-color captures are alongside the presentation reports. Touch checks use browser emulation. The maintained fixture is `fixtures/example.mp4` (H.264/AAC).

### Review fixes

Modern controls retain keyboard focusability while visually hidden, including when the timeline is disabled (for example, a live source without a seek window). At widths of 380px and below, utility actions occupy their own row; longer time labels can wrap without pushing controls outside the player. Fullscreen removes the modern embedded stage minimum height, so short landscape windows remain contained. Regression coverage includes 320/360/400px embeds, unavailable seeking with Tab navigation, and 600×280 fullscreen.

Review validation: **20/20** checks passed in [Chrome](../results/player-presentation/chrome-2026-09-27T17-31-41.212Z/result.json) and [Firefox](../results/player-presentation/firefox-2026-09-27T17-32-20.236Z/result.json). The narrow-layout and compact-fullscreen failures were reproduced before their fixes. Narrow-layout and fullscreen screenshots were inspected. TypeScript passed; the original 50-check classic baseline above remains the prior implementation result.

### Playback priority for timeline thumbnails

The element defaults to the Adaptive strategy: 24 samples distributed across the finite timeline first, followed by five-second samples within 30 seconds of playback or the latest hover position. Its cache remains bounded to 16 MiB / 96 entries. It does not eagerly generate every five-second position in a long movie. Explicit `previewOptions` retain their own configuration. The thumbnail toggle and initial `no-preview` attribute stop generation as well as hiding the image; enabling the toggle cannot override `previewOptions: false` or `enabled: false`. Software samples deferred by active playback remain queued for pause. Hover requests check the cache without waiting for an active decode and use strategy-specific proximity and preserve the approximate represented timestamp. Adaptive hover can show a broad sample immediately, then request a closer frame. Exact API requests do not use nearby samples. The first uncached request still requires decoding; the UI shows the requested time while waiting.

Independent local browser/remux preview providers may run during playback. Software decoding yields to playback; generation suspends during operations and buffering. Hover requests supersede background generation.

For accepted local Native packet-copy routes, the preview lane tries an independent muted remux session before direct-browser or software decoding. Other sources retain the existing fallback. The remux session uses an 8 MiB buffering budget, is destroyed on completion/cancellation, and never receives the main playback surface. Preview dimensions and the decode-pixel limit still apply; reported timestamps remain approximate.

### Thumbnail strategies

The player settings menu offers Adaptive, Evenly spaced (48 samples), Whole video (every 5 seconds), and On hover only. Selecting a strategy changes preview scheduling without reopening, pausing, seeking, or replacing playback. Custom configurations appear as Custom in this menu.

| API strategy | Background work |
| --- | --- |
| `{type: 'adaptive', samples: 24, every: 5, radius: 30}` | Broad coverage first, then a bounded neighborhood around playback or hover; interval/radius are seconds |
| `{type: 'uniform', samples: 48}` | A fixed count spread across the whole duration; 2–256 samples |
| `{type: 'interval', every: 5, unit: 'seconds'}` | Sequential positions at 0, 5, 10… until the end; optional `count` caps work without redistributing positions |
| `{type: 'on-demand'}` | No background generation; hover/API requests still work |
| `{type: 'timestamps', timestamps: [0, 60, 120]}` | Host-selected positions in seconds; optional `count` |

```js
const player = new Player(container, {
  preview: {
    strategy: { type: 'adaptive', samples: 24, every: 5, radius: 30 },
    maxEntries: 96,
    maxCacheBytes: 16 * 1024 * 1024,
  },
});

// Can change during a session; useful cached images remain available.
player.preview.setStrategy({ type: 'interval', every: 10 });
player.preview.setStrategy({ type: 'on-demand' });
console.log(player.preview.strategy);
```

For the element, assign `element.previewOptions` before connecting it to the document; use `element.player.preview.setStrategy(...)` after initialization. Core `new Player(...)` retains its on-demand default unless configured. Existing `pregenerate` configurations remain supported; specify either `strategy` or `pregenerate`, not both. Legacy `pregenerate` configuration reports `preview.strategy === null` (Custom).

Adaptive background work follows the latest hover for 1.5 seconds before playback updates regain priority. Explicit foreground requests still preempt background work. Source replacement resets coverage and focus. All strategies retain the existing buffering, cancellation, and software-playback restrictions. Cache limits remain independent of generation targets, so fixed intervals across a long video can evict earlier images. Adaptive scheduling retains at most 512 visited positions and enumerates only the local window; it never allocates an array proportional to the movie duration. Radius is limited to 3,600 seconds and at most 128 interval steps in either direction. These strategies select timestamps, not scene boundaries or semantic keyframes.

### Application-managed thumbnail cache

Use `on-demand` to stop automatic generation while retaining cached images. Request
frames as needed, unload ranges, and adjust memory/count budgets without reopening
playback:

```js
const previews = player.preview;
previews.setStrategy({type: 'on-demand'});
previews.setCacheLimits({maxEntries: 200, maxCacheBytes: 32 * 1024 * 1024});
const frame = await previews.getFrame({time: 120, width: 240, height: 135});
await previews.prefetch({time: 125, width: 240, height: 135});
previews.unload({start: 0, end: 60}); // [0, 60), across all cached sizes
previews.clear(); // Cancel outstanding requests and remove all cached frames
```

`getFrame` loads one frame, with an optional `AbortSignal`; newer foreground requests
supersede older ones. Request batches sequentially. `prefetch` is best-effort: it
declines when the lane is busy and yields to hover. Neither bypasses playback pressure.
`unload` returns the number of removed cache entries and cancels matching outstanding
work, preventing late results from repopulating that range. Ranges match requested
bucket timestamps (not a provider's approximate represented time).

`cacheLimits` is an immutable snapshot. Lowering limits immediately evicts entries,
preferentially background entries; zero disables retention but still allows requests.
Automatic strategies may regenerate unloaded images; select `on-demand` for manual
ownership. `clear()` restarts an active automatic strategy. Cache eviction releases
Demuxe's references, not frame objects or Blob URLs retained by the application;
applications must release their own references and revoke their own object URLs.
These limits cover thumbnail cache accounting, not all decoder or browser memory.
