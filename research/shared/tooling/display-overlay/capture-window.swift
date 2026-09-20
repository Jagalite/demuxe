// SPDX-License-Identifier: Apache-2.0
import Foundation
import ScreenCaptureKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import Darwin
@main struct Main {
 static func main() async {
  do {
   let pid=Int32(CommandLine.arguments[1])!,path=CommandLine.arguments[2]
   let content=try await SCShareableContent.excludingDesktopWindows(true,onScreenWindowsOnly:true)
   guard let window=content.windows.filter({$0.owningApplication?.processID==pid}).max(by:{$0.frame.width*$0.frame.height<$1.frame.width*$1.frame.height}) else {throw NSError(domain:"OwnedWindowMissing",code:1)}
   guard let display=content.displays.first(where:{$0.frame.intersects(window.frame)}) else {throw NSError(domain:"OwnedDisplayMissing",code:1)}
   let filter=SCContentFilter(display:display,including:[window]),config=SCStreamConfiguration()
   config.sourceRect=window.frame
   config.width=Int(window.frame.width)*2;config.height=Int(window.frame.height)*2;config.showsCursor=false;config.ignoreShadowsSingleWindow=true
   let image=try await SCScreenshotManager.captureImage(contentFilter:filter,configuration:config)
   guard let dest=CGImageDestinationCreateWithURL(URL(fileURLWithPath:path) as CFURL,UTType.png.identifier as CFString,1,nil) else {throw NSError(domain:"ImageDestination",code:1)}
   CGImageDestinationAddImage(dest,image,nil);guard CGImageDestinationFinalize(dest) else {throw NSError(domain:"PNGWrite",code:1)}
   let row:[String:Any]=["pid":pid,"windowID":window.windowID,"windowFrame":[window.frame.origin.x,window.frame.origin.y,window.frame.width,window.frame.height],"width":image.width,"height":image.height,"method":"ScreenCaptureKit owned window composition output; not physical photons or proof of overlay promotion"]
   print(String(decoding:try JSONSerialization.data(withJSONObject:row,options:.sortedKeys),as:UTF8.self))
  } catch {fputs("CAPTURE_ERROR \(error)\n",stderr);exit(1)}
 }
}
