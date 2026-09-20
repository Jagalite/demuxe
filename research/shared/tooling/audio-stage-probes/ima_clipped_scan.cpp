// SPDX-License-Identifier: Apache-2.0
#include <vector>
#include <array>
#include <fstream>
#include <thread>
#include <cstdint>
#include <string>
#include <algorithm>
struct T{int64_t a,lo,hi;};
int64_t clip(int64_t x,int64_t lo,int64_t hi){return std::max(lo,std::min(hi,x));}
T compose(T x,T y){return {x.a+y.a,clip(x.lo+y.a,y.lo,y.hi),clip(x.hi+y.a,y.lo,y.hi)};}
std::vector<int> scan(const std::vector<int>&delta,int initial,int lo,int hi){size_t n=delta.size();std::vector<T>local(n);std::array<T,4>totals,carry;std::array<std::thread,4>workers;for(size_t t=0;t<4;t++)workers[t]=std::thread([&,t]{T state{0,lo,hi};for(size_t i=n*t/4;i<n*(t+1)/4;i++){state=compose(state,T{delta[i],lo,hi});local[i]=state;}totals[t]=state;});for(auto&w:workers)w.join();T state{0,lo,hi};for(size_t t=0;t<4;t++){carry[t]=state;state=compose(state,totals[t]);}std::vector<int>out(n);for(size_t t=0;t<4;t++)workers[t]=std::thread([&,t]{for(size_t i=n*t/4;i<n*(t+1)/4;i++){T full=compose(carry[t],local[i]);out[i]=clip(initial+full.a,full.lo,full.hi);}});for(auto&w:workers)w.join();return out;}
int main(int argc,char**argv){if(argc!=5)return 2;std::ifstream tb(argv[2],std::ios::binary);std::array<int32_t,89>steps;tb.read((char*)steps.data(),356);if(!tb)return 3;std::ifstream in(argv[3],std::ios::binary);uint32_t count;in.read((char*)&count,4);std::vector<int16_t>out;std::string mode=argv[1];const int adj[8]={-1,-1,-1,-1,2,4,6,8};for(uint32_t b=0;b<count;b++){int32_t pred,index;uint32_t n;in.read((char*)&pred,4);in.read((char*)&index,4);in.read((char*)&n,4);if(!in||index<0||index>88||pred<-32768||pred>32767||n>100000)return 4;std::vector<uint8_t>codes(n);in.read((char*)codes.data(),n);if(!in)return 5;for(auto code:codes)if(code>15)return 6;out.push_back(pred);if(mode=="serial"){for(auto code:codes){int step=steps[index],mag=code&7;int delta=(step>>3)+(mag&4?step:0)+(mag&2?step>>1:0)+(mag&1?step>>2:0);pred=clip(pred+(code&8?-delta:delta),-32768,32767);index=clip(index+adj[mag],0,88);out.push_back(pred);}}else if(mode=="parallel"){std::vector<int>adjust(n),delta(n);for(size_t i=0;i<n;i++)adjust[i]=adj[codes[i]&7];auto indices=scan(adjust,index,0,88);for(size_t i=0;i<n;i++){int step=steps[i?indices[i-1]:index],mag=codes[i]&7;delta[i]=(step>>3)+(mag&4?step:0)+(mag&2?step>>1:0)+(mag&1?step>>2:0);if(codes[i]&8)delta[i]=-delta[i];}auto pcm=scan(delta,pred,-32768,32767);out.insert(out.end(),pcm.begin(),pcm.end());}else return 7;}std::ofstream dst(argv[4],std::ios::binary);dst.write((char*)out.data(),out.size()*2);return dst?0:8;}
