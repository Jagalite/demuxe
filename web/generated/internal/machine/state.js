// SPDX-License-Identifier: Apache-2.0
import { initialOperations } from './operations.js';
import { initialPlayback } from './playback.js';
import { initialSettings } from './settings.js';
import { initialSource } from './source.js';
export function initialPlayerControl() { return Object.freeze({ revision: 0, operations: initialOperations(), playback: initialPlayback(), settings: initialSettings(), source: initialSource() }); }
