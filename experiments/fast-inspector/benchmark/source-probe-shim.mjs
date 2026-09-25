// SPDX-License-Identifier: Apache-2.0
// Served at /web/source-probe.js by the isolated playback benchmark only.
import {inspectFile} from '/experiments/fast-inspector/benchmark/fast-inspector.mjs';
export async function probeSource(source) {
  const result = await inspectFile(source.file);
  if (result.status !== 'qualified') throw Error('Fast inspection unknown: ' + result.reason);
  return result.evidence;
}
