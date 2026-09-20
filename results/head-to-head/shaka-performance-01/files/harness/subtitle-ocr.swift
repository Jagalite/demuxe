// SPDX-License-Identifier: Apache-2.0
import Foundation
import Vision
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["en-US"]
let handler = VNImageRequestHandler(url: URL(fileURLWithPath: CommandLine.arguments[1]))
try handler.perform([request])
print((request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: " "))
