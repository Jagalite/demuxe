#pragma once
__attribute__((import_module("test"),import_name("fail"),noreturn))
void test_fail(const char *,const char *,int);
#define assert(x) ((x)?(void)0:test_fail(#x,__FILE__,__LINE__))
