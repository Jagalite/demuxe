// SPDX-License-Identifier: Apache-2.0
// Canvas video geometry is independent of the bounded diagnostic sample history.
export function retainedVideoGeometry(frame,canvas,track) {
  const par = Number(track?.['demux-par']);
  const visible=frame.visibleRect??{x:0,y:0,width:frame.width,height:frame.height};
  const width = Number.isFinite(par) && par > 0 ? visible.width * par : (frame.displayWidth??visible.width);
  const height = Number.isFinite(par) && par > 0 ? visible.height : (frame.displayHeight??visible.height);
  const rotation = ((Number(track?.['demux-rotation']) || 0) % 360 + 360) % 360;
  const radians = rotation * Math.PI / 180;
  const sin = Math.abs(Math.sin(radians)), cos = Math.abs(Math.cos(radians));
  const scale = Math.min(canvas.width / (width * cos + height * sin), canvas.height / (width * sin + height * cos));
  const drawnWidth=(width*cos+height*sin)*scale,drawnHeight=(width*sin+height*cos)*scale;
  return {src:[visible.x??0,visible.y??0,visible.width,visible.height],dst:[(canvas.width-drawnWidth)/2,(canvas.height-drawnHeight)/2,drawnWidth,drawnHeight],rotation,width,height,scale};
}
export function drawRetainedVideo(context, frame, canvas, track) {
  const {rotation,width,height,scale}=retainedVideoGeometry(frame,canvas,track);
  const radians=rotation*Math.PI/180;
  context.save();
  context.fillStyle = '#000';context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);context.rotate(radians);
  context.drawImage(frame, -width * scale / 2, -height * scale / 2, width * scale, height * scale);
  context.restore();
}
