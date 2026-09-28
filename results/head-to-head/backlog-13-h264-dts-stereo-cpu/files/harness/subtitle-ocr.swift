// SPDX-License-Identifier: Apache-2.0
import Foundation
import Vision
let request = VNRecognizeTextRequest()
// The synthetic marker uses large, high-contrast glyphs. Fast recognition
// avoids a macOS neural-engine compiler hang while preserving the same text assertion.
request.recognitionLevel = .fast
request.usesLanguageCorrection = false
request.recognitionLanguages = ["en-US"]
let handler = VNImageRequestHandler(url: URL(fileURLWithPath: CommandLine.arguments[1]))
try handler.perform([request])
print((request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: " "))
