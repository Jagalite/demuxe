#ifndef MP_OSDEP_THREADS_H_
#define MP_OSDEP_THREADS_H_

#include "config.h"

#if defined(DEMUXE_COOP_THREADS) && DEMUXE_COOP_THREADS
#include "threads-coop.h"
#elif HAVE_WIN32_THREADS
#include "threads-win32.h"
#else
#include "threads-posix.h"
#endif

#include "osdep/compiler.h"  // for thread_local

#endif
