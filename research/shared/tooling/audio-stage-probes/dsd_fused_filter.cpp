// SPDX-License-Identifier: Apache-2.0
#include <vector>
#include <array>
#include <fstream>
#include <cstdint>
#include <string>
using Table=std::array<double,256>;
std::vector<Table> tables(const std::vector<double>&h){std::vector<Table>t((h.size()+7)/8);for(size_t j=0;j<t.size();j++)for(int v=0;v<256;v++){double s=0;for(size_t m=0;m<8;m++)if(j*8+m<h.size())s+=(((v>>(7-m))&1)*2-1)*h[j*8+m];t[j][v]=s;}return t;}
double sample(const std::vector<uint8_t>&x,size_t q,const std::vector<Table>&t){double s=0;for(size_t j=0;j<t.size();j++)s+=t[j][q>=j?x[q-j]:0x96];return s;}
int main(int argc,char**argv){if(argc!=5)return 2;std::ifstream cf(argv[2],std::ios::binary);uint32_t nh,ng;cf.read((char*)&nh,4);cf.read((char*)&ng,4);if(nh!=96||ng!=17)return 3;std::vector<double>h(nh),g(ng);cf.read((char*)h.data(),nh*8);cf.read((char*)g.data(),ng*8);std::ifstream input(argv[3],std::ios::binary);std::vector<uint8_t>x((std::istreambuf_iterator<char>(input)),{});if(x.size()<256)return 4;std::vector<float>out;std::string mode=argv[1];if(mode=="baseline"){auto t=tables(h);std::vector<float>u(x.size());for(size_t q=0;q<x.size();q++)u[q]=sample(x,q,t);for(size_t q=128;q<x.size();q+=8){double s=0;for(size_t j=0;j<g.size();j++)s+=g[j]*u[q-j];out.push_back(s);}}else if(mode=="fused"){std::vector<double>k(nh+8*(ng-1));for(size_t j=0;j<ng;j++)for(size_t i=0;i<nh;i++)k[i+8*j]+=g[j]*h[i];auto t=tables(k);for(size_t q=128;q<x.size();q+=8)out.push_back(sample(x,q,t));}else return 5;std::ofstream dst(argv[4],std::ios::binary);dst.write((char*)out.data(),out.size()*4);return dst?0:6;}
