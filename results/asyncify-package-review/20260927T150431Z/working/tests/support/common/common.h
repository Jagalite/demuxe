/* SPDX-License-Identifier: MIT
 * UNIT-TEST COMPATIBILITY HEADER, NOT mpv's allocator/common implementation.
 * The copied dispatch and thread-pool algorithms themselves stay unmodified.
 */
#pragma once
#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>
#include <assert.h>
#define mp_assert assert
#define MP_ASSERT_UNREACHABLE() assert(0)
#define MPMAX(a,b) ((a)>(b)?(a):(b))
void *ta_alloc(void *parent,size_t size);
void *ta_resize(void *parent,void *ptr,size_t size);
void *talloc_steal(void *parent,void *ptr);
void talloc_free(void *ptr);
void talloc_set_destructor(void *ptr,void (*fn)(void *));
#define talloc_ptrtype(p,v) ta_alloc(p,sizeof(*(v)))
#define talloc_zero(p,t) ((t *)ta_alloc(p,sizeof(t)))
#define TA_FREEP(v) do { talloc_free(*(v));*(v)=NULL; } while(0)
#define MP_TARRAY_APPEND(p,a,n,v) do{a=ta_resize(p,a,((n)+1)*sizeof(*(a)));(a)[(n)++]=(v);}while(0)
#define MP_TARRAY_INSERT_AT(p,a,n,i,v) do{a=ta_resize(p,a,((n)+1)*sizeof(*(a)));for(int _j=(n);_j>(i);_j--)(a)[_j]=(a)[_j-1];(a)[i]=(v);(n)++;}while(0)
#define MP_TARRAY_REMOVE_AT(a,n,i) do{for(int _j=(i);_j+1<(n);_j++)(a)[_j]=(a)[_j+1];(n)--;}while(0)
