// SPDX-License-Identifier: MIT
// Compare the Wasm LUT against upstream's exact transfer functions. No timing.
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <vector>
#include "common/cpuinfo.h"
#include "colorspace/operation_impl.h"
#include "colorspace/gamma.h"
using namespace zimg;
using namespace zimg::colorspace;
int main() {
    const unsigned count=262145;
    std::vector<float> input(count), exact(count), approximate(count);
    for(unsigned i=0;i<count;i++)input[i]=i%2?float(i)/count:std::pow(10.0f,-12.0f+16.0f*i/count);
    const float *src[]={input.data(),input.data(),input.data()};
    float *dst[]={approximate.data(),approximate.data(),approximate.data()};
    const gamma_func functions[]={rec_1886_inverse_eotf,rec_709_oetf,srgb_inverse_eotf,st_2084_inverse_eotf,arib_b67_oetf};
    bool passed=true,exactUnchanged=true;
    std::printf("{\"cases\":[");
    for(unsigned f=0;f<5;f++) {
        const TransferFunction transfer={nullptr,functions[f],1.0f,1.0f};
        OperationParams params;params.approximate_gamma=true;
        auto operation=create_gamma_operation(transfer,params,CPUClass::NONE);
        operation->process(src,dst,0,count);
        double maxSDRError=0,maxRelative=0;
        for(unsigned i=0;i<count;i++) {
            const float expected=functions[f](input[i]);
            const double error=std::abs(approximate[i]-expected);
            if(expected<=1)maxSDRError=std::max(maxSDRError,error);
            maxRelative=std::max(maxRelative,error/std::max(double(expected),1e-6));
            if(!std::isfinite(approximate[i]))passed=false;
        }
        params.approximate_gamma=false;
        operation=create_gamma_operation(transfer,params,CPUClass::NONE);
        operation->process(src,dst,0,count);
        for(unsigned i=0;i<count;i++)if(approximate[i]!=functions[f](input[i]))exactUnchanged=passed=false;
        if(maxSDRError>.003||maxRelative>.006)passed=false;
        std::printf("%s{\"transfer\":%u,\"samples\":%u,\"maxSDRError\":%.9g,\"maxRelative\":%.9g}",f?",":"",f,count,maxSDRError,maxRelative);
    }
    std::printf("],\"inverseCases\":[");
    const gamma_func inverse[]={rec_1886_eotf,rec_709_inverse_oetf,srgb_eotf,st_2084_eotf,arib_b67_inverse_oetf};
    for(unsigned i=0;i<count;i++)input[i]=float(i)/(count-1);
    for(unsigned f=0;f<5;f++) {
        const TransferFunction transfer={inverse[f],nullptr,2.0f,1.0f};
        OperationParams params;params.approximate_gamma=true;
        auto operation=create_inverse_gamma_operation(transfer,params,CPUClass::NONE);
        operation->process(src,dst,0,count);
        double maxError=0;bool matchesTable=true;
        for(unsigned i=0;i<count;i++) {
            const float index=std::nearbyint(input[i]*32768.0f+16384.0f);
            const float expected=inverse[f](index/32768.0f-.5f)*2.0f;
            if(approximate[i]!=expected)matchesTable=false;
            maxError=std::max(maxError,double(std::abs(approximate[i]-inverse[f](input[i])*2.0f)));
        }
        params.approximate_gamma=false;
        operation=create_inverse_gamma_operation(transfer,params,CPUClass::NONE);
        operation->process(src,dst,0,count);
        for(unsigned i=0;i<count;i++)if(approximate[i]!=inverse[f](input[i])*2.0f)exactUnchanged=passed=false;
        // At most 0.02% of full-scale linear output across the dense SDR/PQ/HLG grid.
        if(!matchesTable||maxError/(inverse[f](1.0f)*2.0f)>.0002)passed=false;
        std::printf("%s{\"transfer\":%u,\"samples\":%u,\"maxError\":%.9g,\"matchesTable\":%s}",f?",":"",f,count,maxError,matchesTable?"true":"false");
    }
    std::printf("],\"exactUnchanged\":%s,\"passed\":%s}\n",exactUnchanged?"true":"false",passed?"true":"false");return passed?0:1;
}
