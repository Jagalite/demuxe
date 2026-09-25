// SPDX-License-Identifier: Apache-2.0
// Test-only Darwin thread CPU snapshot for subtitle attribution.
#include <libproc.h>
#include <sys/proc_info.h>
#include <stdint.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc != 2) return 2;
  int pid = atoi(argv[1]);
  if (!pid) pid = getpid();
  uint64_t ids[2048];
  int bytes = proc_pidinfo(pid, PROC_PIDLISTTHREADS, 0, ids, sizeof ids);
  if (bytes <= 0) { perror("proc_pidinfo PROC_PIDLISTTHREADS"); fprintf(stderr,"bytes=%d errno=%d\n",bytes,errno); return 3; }
  printf("[\n");
  int printed = 0;
  for (int i = 0; i < bytes / (int)sizeof(uint64_t); i++) {
    struct proc_threadinfo info;
    int got = proc_pidinfo(pid, PROC_PIDTHREADINFO, ids[i], &info, sizeof info);
    if (got != sizeof info) { if(i < 3) fprintf(stderr,"thread addr=%llu got=%d need=%zu errno=%d\n",(unsigned long long)ids[i],got,sizeof info,errno); continue; }
    if (printed++) printf(",\n");
    printf("{\"id\":%llu,\"userNs\":%llu,\"systemNs\":%llu,\"name\":\"",
      (unsigned long long)ids[i], (unsigned long long)info.pth_user_time,
      (unsigned long long)info.pth_system_time);
    for (const char *p = info.pth_name; *p; p++) {
      if (*p == '"' || *p == '\\') putchar('\\');
      if ((unsigned char)*p >= 32) putchar(*p);
    }
    printf("\"}");
  }
  printf("\n]\n");
  return 0;
}
