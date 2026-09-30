// Served over /web/source-probe.js by the isolated benchmark only.
import {inspectFile} from '/experiments/mediabunny-inspector/benchmark/inspector.mjs';
export async function probeSource(source) {
  const result = await inspectFile(source.file);
  if (!result.complete) throw Error('MediaBunny probe incomplete: ' + result.reasons.join('; '));
  return result.probe;
}
