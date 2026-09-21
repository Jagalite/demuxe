// SPDX-License-Identifier: Apache-2.0
#include <dlfcn.h>
#include <stdint.h>
#include <stdio.h>
static void *handle;
int load_codec(void){handle=dlopen("/codec.wasm",RTLD_NOW|RTLD_LOCAL);if(!handle){fprintf(stderr,"%s\n",dlerror());return -1;}return 0;}
int run_codec(const uint8_t *data,int length){int (*run)(const uint8_t*,int)=dlsym(handle,"decode_fixture");return run?run(data,length):-2;}
uint32_t codec_checksum(void){uint32_t (*get)(void)=dlsym(handle,"get_checksum");return get?get():0;}
int unload_codec(void){if(!handle)return 0;int r=dlclose(handle);handle=0;return r;}
