// SPDX-License-Identifier: Apache-2.0
#import <Cocoa/Cocoa.h>
#import <AVFoundation/AVFoundation.h>
#import <IOSurface/IOSurface.h>
#import <QuartzCore/QuartzCore.h>
int main(int argc,char**argv){@autoreleasepool{
 if(argc<2)return 2;
 NSApplication *app=[NSApplication sharedApplication];[app setActivationPolicy:NSApplicationActivationPolicyRegular];[app finishLaunching];
 NSWindow*w=[[NSWindow alloc]initWithContentRect:NSMakeRect(100,100,320,180) styleMask:NSWindowStyleMaskTitled backing:NSBackingStoreBuffered defer:NO];
 [w setReleasedWhenClosed:NO];[w setTitle:@"Demuxe owned physical surface bridge"];[w setLevel:NSFloatingWindowLevel];w.contentView.wantsLayer=YES;
 AVSampleBufferDisplayLayer*l=[AVSampleBufferDisplayLayer layer];l.frame=w.contentView.bounds;l.videoGravity=AVLayerVideoGravityResizeAspect;
 [w.contentView.layer addSublayer:l];[w makeKeyAndOrderFront:nil];[app activateIgnoringOtherApps:YES];
 CMTimebaseRef tb;CMTimebaseCreateWithSourceClock(kCFAllocatorDefault,CMClockGetHostTimeClock(),&tb);CMTimebaseSetTime(tb,kCMTimeZero);CMTimebaseSetRate(tb,1);l.controlTimebase=tb;
 FILE*f=fopen(argv[1],"w");fprintf(f,"{\"pid\":%d,\"frames\":[",getpid());fflush(f);
 double begin=CACurrentMediaTime();int count=0;NSMutableArray *retained=[NSMutableArray array];
 while(CACurrentMediaTime()-begin<60){
 double elapsed=CACurrentMediaTime()-begin;
 if(elapsed>=count/24.0&&count<1440){
 CVPixelBufferRef pb=NULL;NSDictionary*a=@{(id)kCVPixelBufferIOSurfacePropertiesKey:@{}};CVPixelBufferCreate(kCFAllocatorDefault,320,180,kCVPixelFormatType_32BGRA,(__bridge CFDictionaryRef)a,&pb);
 CVPixelBufferLockBaseAddress(pb,0);uint8_t*b=CVPixelBufferGetBaseAddress(pb);size_t stride=CVPixelBufferGetBytesPerRow(pb);
 for(int y=0;y<180;y++)for(int x=0;x<320;x++){uint8_t*v=b+y*stride+x*4;v[0]=(x+count)%256;v[1]=y%256;v[2]=(count*7)%256;v[3]=255;}
 CVPixelBufferUnlockBaseAddress(pb,0);
 CMVideoFormatDescriptionRef fmt=NULL;CMVideoFormatDescriptionCreateForImageBuffer(kCFAllocatorDefault,pb,&fmt);
 CMSampleTimingInfo timing={CMTimeMake(1,24),CMTimeMake(count,24),kCMTimeInvalid};CMSampleBufferRef sb=NULL;CMSampleBufferCreateReadyWithImageBuffer(kCFAllocatorDefault,pb,fmt,&timing,&sb);
 [l enqueueSampleBuffer:sb];uint32_t sid=IOSurfaceGetID(CVPixelBufferGetIOSurface(pb));fprintf(f,"%s{\"frame\":%d,\"pts\":%.9f,\"host\":%.9f,\"surface\":%u}",count?",":"",count,count/24.,CACurrentMediaTime(),sid);fflush(f);
 // Retain all source surfaces to make the source identity join unambiguous during the probe.
 [retained addObject:CFBridgingRelease(pb)];CFRelease(sb);CFRelease(fmt);count++;
 }
 NSEvent *ev=[app nextEventMatchingMask:NSEventMaskAny untilDate:[NSDate dateWithTimeIntervalSinceNow:0.002] inMode:NSDefaultRunLoopMode dequeue:YES];if(ev)[app sendEvent:ev];[app updateWindows];
 }
 fprintf(f,"],\"layerStatus\":%ld,\"error\":\"%s\"}\n",(long)l.status,l.error.description.UTF8String?:"");fclose(f);[l flushAndRemoveImage];[w close];CFRelease(tb);
 }return 0;}
