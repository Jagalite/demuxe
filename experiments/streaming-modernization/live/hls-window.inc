/* SPDX-License-Identifier: LGPL-2.1-or-later */
/* Owning-demux-thread window snapshot. A missing timestamp anchor is unknown,
 * never guessed from wall time, MEDIA-SEQUENCE, cached bytes or duration alone. */
int av_demuxe_hls_window(AVFormatContext *s, int stream, struct AVDemuxeWindow *out)
{
    struct playlist *p=demuxe_hls_playlist(s,stream);
    if(!p||p->n_segments<=0||p->n_segments>10000||p->start_seq_no<0||p->start_seq_no>INT64_MAX-p->n_segments)
        return AVERROR(ENOSYS);
    *out=(struct AVDemuxeWindow){.abi=AV_DEMUXE_WINDOW_ABI,.live=!p->finished,
        .complete=p->finished,.first_sequence=p->start_seq_no,
        .last_sequence=p->start_seq_no+p->n_segments-1,.revision=p->demuxe_window_revision};
    if(p->demuxe_window_start==AV_NOPTS_VALUE)return 0;
    int64_t end=p->demuxe_window_start;
    for(int i=0;i<p->n_segments;i++){
        int64_t duration=p->segments[i]->duration;
        if(duration<=0||end>INT64_MAX-duration)return AVERROR_INVALIDDATA;
        end+=duration;
    }
    out->known=1;out->start_us=p->demuxe_window_start;out->end_us=end;
    return 0;
}
