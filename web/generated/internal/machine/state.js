// SPDX-License-Identifier: Apache-2.0
import { initialPlayerReadiness } from './player-readiness.js';
import { initialPlayerActions } from './player-actions.js';
import { initialPlayerPublication } from './player-publication.js';
import { initialPlayerMonitor } from './player-monitor.js';
import { initialOperations } from './operations.js';
import { initialPlayback } from './playback.js';
import { initialSettings, initialPreferences, initialSettingsTransactions } from './settings.js';
import { initialBoundary } from './playback-boundary.js';
import { initialSource } from './source.js';
import { initialAttachments } from './attachments.js';
import { initialRouting } from './route-state.js';
export function initialPlayerControl() { return Object.freeze({ revision: 0, captureRevision: 0, readiness: initialPlayerReadiness(), actions: initialPlayerActions(), publication: initialPlayerPublication(), monitor: initialPlayerMonitor(), attachments: initialAttachments(), routing: initialRouting(), boundary: initialBoundary(), operations: initialOperations(), playback: initialPlayback(), settings: initialSettings(), preferences: initialPreferences(), settingsTransactions: initialSettingsTransactions(), source: initialSource() }); }
