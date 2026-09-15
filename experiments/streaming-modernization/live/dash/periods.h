/* SPDX-License-Identifier: LGPL-2.1-or-later */
#ifndef DEMUXE_DASH_PERIODS_H
#define DEMUXE_DASH_PERIODS_H
#include <stdint.h>
#include <libxml/tree.h>
#define DEMUXE_DASH_PERIOD_LIMIT 32
struct demuxe_dash_period {
    char id[128];
    int64_t start_us, duration_us; /* AV_NOPTS_VALUE means an open live end. */
    xmlNodePtr node; /* borrowed from the single owning manifest document */
};
struct demuxe_dash_periods {
    int count, dynamic;
    int64_t duration_us;
    struct demuxe_dash_period values[DEMUXE_DASH_PERIOD_LIMIT];
};
int demuxe_dash_duration_us(const char *,int64_t *);
int demuxe_dash_collect_periods(xmlNodePtr,struct demuxe_dash_periods *);
int demuxe_dash_map_timestamp(int64_t ticks,int64_t presentation_offset,
    int timescale,int64_t period_start_us,int64_t *presentation_us);
#endif
