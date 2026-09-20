// SPDX-License-Identifier: Apache-2.0
import Foundation
import ScreenCaptureKit
import CoreMedia
import CoreVideo
import CoreGraphics
import Darwin
final class Receiver: NSObject, SCStreamOutput, @unchecked Sendable {
 let file: FileHandle; var count=0
 init(_ path:String){FileManager.default.createFile(atPath:path,contents:nil);file=try! FileHandle(forWritingTo:URL(fileURLWithPath:path))}
 func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of outputType: SCStreamOutputType){
  guard outputType == .screen, let image=sampleBuffer.imageBuffer, let a=CMSampleBufferGetSampleAttachmentsArray(sampleBuffer,createIfNecessary:false) as? [[SCStreamFrameInfo:Any]],let info=a.first else{return}
  CVPixelBufferLockBaseAddress(image,.readOnly);defer{CVPixelBufferUnlockBaseAddress(image,.readOnly)}
  let width=CVPixelBufferGetWidth(image),height=CVPixelBufferGetHeight(image),stride=CVPixelBufferGetBytesPerRow(image),base=CVPixelBufferGetBaseAddress(image)!.assumingMemoryBound(to:UInt8.self)
  // Small, deterministic luma grid over owned video content. No unrelated window content is captured.
  var grid=[Int]();for y in 0..<18{for x in 0..<32{let px=min(width-1,1+x*20+10),py=min(height-1,80+y*20+10);let off=py*stride+px*4;grid.append((Int(base[off])+Int(base[off+1])+Int(base[off+2]))/3)}}
  var timebase=mach_timebase_info_data_t();mach_timebase_info(&timebase)
  let row:[String:Any] = ["timebaseNumer":timebase.numer,"timebaseDenom":timebase.denom,"index":count,"status":(info[.status] as? NSNumber)?.intValue ?? -1,"displayTime":(info[.displayTime] as? NSNumber)?.uint64Value ?? 0,"samplePTS":CMTimeGetSeconds(sampleBuffer.presentationTimeStamp),"width":width,"height":height,"grid":grid]
  if let data=try? JSONSerialization.data(withJSONObject:row,options:[.sortedKeys]){try? file.write(contentsOf:data);try? file.write(contentsOf:Data([10]))};count+=1
 }
}
@main struct Main{
 static func main() async {
  do{
   let pid=Int32(CommandLine.arguments[1])!,out=CommandLine.arguments[2],seconds=Double(CommandLine.arguments[3]) ?? 8
   let content=try await SCShareableContent.excludingDesktopWindows(false,onScreenWindowsOnly:true)
   guard let window=content.windows.first(where:{$0.owningApplication?.processID==pid}),let display=content.displays.first(where:{$0.frame.intersects(window.frame)}) else{throw NSError(domain:"owned-window-missing",code:1)}
   let filter=SCContentFilter(display:display,including:[window]);let config=SCStreamConfiguration();config.sourceRect=window.frame;config.width=Int(window.frame.width);config.height=Int(window.frame.height);config.minimumFrameInterval=CMTime(value:1,timescale:120);config.queueDepth=3;config.showsCursor=false;config.pixelFormat=kCVPixelFormatType_32BGRA
   let receiver=Receiver(out);let stream=SCStream(filter:filter,configuration:config,delegate:nil);try stream.addStreamOutput(receiver,type:.screen,sampleHandlerQueue:DispatchQueue(label:"demuxe.capture"));try await stream.startCapture();print("CAPTURE_READY");fflush(stdout)
   try await Task.sleep(nanoseconds:UInt64(seconds*1e9));try await stream.stopCapture();print("CAPTURE_DONE \(receiver.count)")
  }catch{fputs("CAPTURE_ERROR \(error)\n",stderr);exit(1)}
 }
}
