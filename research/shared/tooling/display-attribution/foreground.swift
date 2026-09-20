// SPDX-License-Identifier: Apache-2.0
import AppKit
import CoreGraphics
if CommandLine.arguments.count > 1, let pid = Int32(CommandLine.arguments[1]), let app = NSRunningApplication(processIdentifier: pid) {
    _ = app.activate(options: [.activateIgnoringOtherApps])
    RunLoop.current.run(until: Date(timeIntervalSinceNow: 0.3))
}
let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID) as? [[String:Any]] ?? []
let result: [String:Any] = ["frontmostPID": NSWorkspace.shared.frontmostApplication?.processIdentifier ?? -1,
 "scope": "Only the explicitly requested owned process; unrelated windows excluded",
 "windows": windows.filter { ($0[kCGWindowOwnerPID as String] as? Int32) == (CommandLine.arguments.count > 1 ? Int32(CommandLine.arguments[1]) : nil) }.map { ["pid": $0[kCGWindowOwnerPID as String] ?? 0,"id": $0[kCGWindowNumber as String] ?? 0,"layer": $0[kCGWindowLayer as String] ?? 0,"owner": $0[kCGWindowOwnerName as String] ?? "", "name": $0[kCGWindowName as String] ?? "", "bounds": $0[kCGWindowBounds as String] ?? [:]] }]
let data = try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted,.sortedKeys])
print(String(decoding:data,as:UTF8.self))
