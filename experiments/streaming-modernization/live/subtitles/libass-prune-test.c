// SPDX-License-Identifier: GPL-2.0-or-later
#include <ass/ass.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
static const char header[]="[Script Info]\nScriptType: v4.00+\nPlayResX: 640\nPlayResY: 360\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,sans-serif,20,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n";
int main(void){
 ASS_Library *library=ass_library_init();assert(library);
 ASS_Renderer *renderer=ass_renderer_init(library);assert(renderer);
 ass_set_frame_size(renderer,640,360);ass_set_fonts(renderer,NULL,"sans-serif",0,NULL,0);
 ASS_Track *track=ass_new_track(library);assert(track);
 ass_process_codec_private(track,header,sizeof(header)-1);ass_set_check_readorder(track,0);ass_configure_prune(track,60000);
 char chunk[100];int change;int peak=0;
 for(int i=0;i<1000;i++){
  snprintf(chunk,sizeof(chunk),"%d,0,Default,,0,0,0,,cue",i);
  ass_process_chunk(track,chunk,strlen(chunk),i*2000LL,2000);
  ass_render_frame(renderer,track,i*2000LL,&change);
  if(track->n_events>peak)peak=track->n_events;
  assert(track->n_events<=32);
 }
 ass_flush_events(track);assert(!track->n_events);
 // A seek back must accept the same ReadOrder and retain the spanning cue.
 const char *cue="0,0,Default,,0,0,0,,spanning cue";
 ass_process_chunk(track,cue,strlen(cue),0,1000000);
 ass_render_frame(renderer,track,100000,&change);assert(track->n_events==1);
 ass_flush_events(track);ass_process_chunk(track,cue,strlen(cue),0,1000000);
 ass_render_frame(renderer,track,500,&change);assert(track->n_events==1);
 printf("PASS libass=%x peakEvents=%d spanningCue=1 seekReload=1\n",ass_library_version(),peak);
 ass_free_track(track);ass_renderer_done(renderer);ass_library_done(library);
}
