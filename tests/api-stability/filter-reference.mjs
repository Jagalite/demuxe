// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';

// Fail closed if the static fixture could let an unapplied filter pass the
// browser's existing 64x36 pixel oracle. Input is decoded RGB, not source colors.
export function assertFilterReferencePixels(pixels,width=64,height=36){
  assert.equal(pixels.length,width*height*3);
  const error={hflip:0,vflip:0,negate:0,grayscale:0};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=(y*width+x)*3;
    for(let c=0;c<3;c++){
      error.hflip+=Math.abs(pixels[at+c]-pixels[(y*width+width-1-x)*3+c])/3;
      error.vflip+=Math.abs(pixels[at+c]-pixels[((height-1-y)*width+x)*3+c])/3;
      error.negate+=Math.abs(pixels[at+c]-(255-pixels[at+c]))/3;
    }
    error.grayscale+=(Math.abs(pixels[at]-pixels[at+1])+Math.abs(pixels[at+1]-pixels[at+2]))/2;
  }
  for(const name of Object.keys(error))error[name]/=width*height;
  for(const [name,threshold]of Object.entries({hflip:20,vflip:25,negate:25,grayscale:10}))
    assert.ok(error[name]>threshold,`Unapplied ${name} could pass: ${error[name]} <= ${threshold}`);
  return error;
}

// Equal RGB channels alone would accept a blank gray surface. Require the
// output's spatial intensities to follow the reference, allowing color-matrix
// and scaling differences between Native and Software capture paths.
export function assertGrayscaleReferencePixels(output,reference,width=64,height=36){
  assert.equal(output.length,width*height*3);assert.equal(reference.length,output.length);
  const expected=[],actual=[];
  for(let at=0;at<output.length;at+=3){
    expected.push(.299*reference[at]+.587*reference[at+1]+.114*reference[at+2]);
    actual.push((output[at]+output[at+1]+output[at+2])/3);
  }
  const mean=values=>values.reduce((a,b)=>a+b,0)/values.length,a=mean(expected),b=mean(actual);
  let covariance=0,referenceVariance=0,outputVariance=0;
  for(let i=0;i<expected.length;i++){
    const x=expected[i]-a,y=actual[i]-b;covariance+=x*y;referenceVariance+=x*x;outputVariance+=y*y;
  }
  assert.ok(referenceVariance>0&&outputVariance>0,'Grayscale output and reference must retain spatial variation');
  const correlation=covariance/Math.sqrt(referenceVariance*outputVariance);
  assert.ok(correlation>.9,`Grayscale output does not retain the reference pattern: ${correlation}`);
  return correlation;
}
