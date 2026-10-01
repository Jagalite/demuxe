// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import {MatroskaReader} from '../build/component-candidates/provider-container/src/matroska.js';
import {assertContainerPixelDimensions, assertContainerDisplayRejection, displayMetadataCases} from './provider-conformance/container.mjs';
const openReader = (blob, signal) => MatroskaReader.open(blob, signal);
test('pixel dimensions without display overrides remain readable', () => assertContainerPixelDimensions(openReader));
for (const [name, display] of displayMetadataCases) {
  test(`${name} without DisplayUnit rejects instead of changing aspect`, () => assertContainerDisplayRejection(openReader, name, display));
}
