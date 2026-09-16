/* Optional external ASS renderer, using the repository's pinned libass stack.
 * One worker owns one library/renderer/track. No media demuxer or playback clock. */
#include <ass/ass.h>
#include <emscripten.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
static ASS_Library *library;
static ASS_Renderer *renderer;
static ASS_Track *track;
static int fonts, font_bytes;
EMSCRIPTEN_KEEPALIVE int subtitle_api_version(void) { return 2; }
EMSCRIPTEN_KEEPALIVE void subtitle_close(void) {
 if(track)ass_free_track(track);track=NULL;
 if(renderer)ass_renderer_done(renderer);renderer=NULL;
 if(library)ass_library_done(library);library=NULL;
 fonts=font_bytes=0;
}
EMSCRIPTEN_KEEPALIVE int subtitle_init(void) {
 subtitle_close();library=ass_library_init();if(!library)return -1;
 renderer=ass_renderer_init(library);if(!renderer){subtitle_close();return -1;}
 ass_set_extract_fonts(library,0);ass_set_cache_limits(renderer,2048,16);
 return 0;
}
EMSCRIPTEN_KEEPALIVE int subtitle_font(char *name,char *data,int size) {
 if(!library||size<=0||size>8*1024*1024||fonts>=17||font_bytes+size>33*1024*1024)return -1;
 ass_add_font(library,name,data,size);fonts++;font_bytes+=size;return 0;
}
EMSCRIPTEN_KEEPALIVE int subtitle_load(char *data,int size) {
 if(!renderer||size<=0||size>8*1024*1024)return -1;
 ASS_Track *candidate=ass_read_memory(library,data,size,"UTF-8");
 if(!candidate)return -1;
 if(candidate->n_events>100000){ass_free_track(candidate);return -1;}
 if(track)ass_free_track(track);
 track=candidate;
 ass_set_fonts(renderer,NULL,"sans-serif",ASS_FONTPROVIDER_NONE,NULL,1);
 return 0;
}
EMSCRIPTEN_KEEPALIVE int subtitle_render(double seconds,int width,int height,int force,int source_width,int source_height) {
 // Without video geometry, libass falls back to the script layout resolution.
 if(source_width<0||source_height<0||(!source_width)!=(!source_height)||source_width>16384||source_height>16384)return -1;
 if(!track||width<1||height<1||width>1920||height>1080||seconds<0)return -1;
 ass_set_frame_size(renderer,width,height);ass_set_storage_size(renderer,source_width,source_height);
 int changed=0,count=0,total=0;
 ASS_Image *first=ass_render_frame(renderer,track,(long long)(seconds*1000),&changed);
 if(!changed&&!force)return -2;
 // Validate the complete result before copying or transferring any bitmap.
 for(ASS_Image *i=first;i;i=i->next){
  if(i->w<=0||i->h<=0)continue;
  if(i->w>1920||i->h>1080||++count>512||i->stride<i->w)return -1;
  total+=i->w*i->h;if(total>2*1024*1024)return -1;
 }
 EM_ASM({Module.tiles=[];});
 for(ASS_Image *i=first;i;i=i->next){
  if(i->w<=0||i->h<=0)continue;
  EM_ASM({const bytes=new Uint8Array($3*$4);for(let y=0;y<$4;y++)bytes.set(HEAPU8.subarray($0+y*$1,$0+y*$1+$3),y*$3);Module.tiles.push({x:$5,y:$6,w:$3,h:$4,color:$2>>>0,bytes});},i->bitmap,i->stride,i->color,i->w,i->h,i->dst_x,i->dst_y);
 }
 return total;
}
