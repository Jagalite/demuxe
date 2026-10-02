// SPDX-License-Identifier: Apache-2.0
import { initialOperations } from './operations.js';
import { initialPlayback } from './playback.js';
import { initialSettings, initialPreferences, initialSettingsTransactions } from './settings.js';
import { initialBoundary } from './playback-boundary.js';
import { initialSource } from './source.js';
import { initialAttachments } from './attachments.js';
export function initialPlayerControl() { return Object.freeze({ revision: 0, attachments: initialAttachments(), boundary: initialBoundary(), operations: initialOperations(), playback: initialPlayback(), settings: initialSettings(), preferences: initialPreferences(), settingsTransactions: initialSettingsTransactions(), source: initialSource() }); }
