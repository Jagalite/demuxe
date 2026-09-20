// SPDX-License-Identifier: Apache-2.0
#include <array>
#include <cstdint>
#include <fstream>
#include <thread>
#include <vector>
#include <string>
int main(int argc,char**argv){if(argc!=4)return 2;std::ifstream in(argv[2],std::ios::binary);uint32_t frames,n;in.read((char*)&frames,4);in.read((char*)&n,4);if(!in||!frames||n!=257||frames>1024)return 3;std::vector<int32_t>v(frames*n),out(frames*n);in.read((char*)v.data(),v.size()*4);if(!in)return 4;std::string mode=argv[1];if(mode=="serial"){for(size_t f=0;f<frames;f++){int64_t state=v[f*n];out[f*n]=state;for(size_t i=1;i<n;i++){state+=v[f*n+i];if(state<-32768||state>32767)return 5;out[f*n+i]=state;}}}else if(mode=="parallel"){std::vector<std::array<int64_t,4>>totals(frames),carry(frames);std::array<std::thread,4>workers;for(size_t t=0;t<4;t++)workers[t]=std::thread([&,t]{for(size_t f=0;f<frames;f++){int64_t sum=0;for(size_t i=1+t*64;i<1+(t+1)*64;i++){sum+=v[f*n+i];out[f*n+i]=sum;}totals[f][t]=sum;}});for(auto&w:workers)w.join();for(size_t f=0;f<frames;f++){int64_t state=v[f*n];out[f*n]=state;for(size_t t=0;t<4;t++){carry[f][t]=state;state+=totals[f][t];}}for(size_t t=0;t<4;t++)workers[t]=std::thread([&,t]{for(size_t f=0;f<frames;f++)for(size_t i=1+t*64;i<1+(t+1)*64;i++)out[f*n+i]+=carry[f][t];});for(auto&w:workers)w.join();for(auto x:out)if(x<-32768||x>32767)return 5;}else return 6;std::ofstream dst(argv[3],std::ios::binary);dst.write((char*)out.data(),out.size()*4);return dst?0:7;}
