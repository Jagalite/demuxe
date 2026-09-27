// SPDX-License-Identifier: LGPL-2.1-or-later
// Export mpv's composed subtitle overlay. Video pixels never enter this buffer.
#include <emscripten.h>
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include "mpv_talloc.h"
#include "sub/osd.h"
#include "sub/osd_state.h"
#include "sub/draw_bmp.h"
#include "video/mp_image.h"
#define MAX_WIDTH 1920
#define MAX_HEIGHT 1080
struct overlay {
    int serial,count,bytes,status,width,height,renders,updates;
    int x,y,w,h;
    unsigned char data[MAX_WIDTH*MAX_HEIGHT*4];
};
static struct overlay output;
static int64_t last_change=-1;
static int last_w,last_h;
static int composites;
_Static_assert(offsetof(struct overlay,data)==48,"subtitle overlay ABI");
EMSCRIPTEN_KEEPALIVE int web_subtitle_overlay_version(void){return 2;}
EMSCRIPTEN_KEEPALIVE int web_subtitle_composite_count(void){return composites;}
EMSCRIPTEN_KEEPALIVE uintptr_t web_subtitle_ptr(void){return (uintptr_t)&output;}
void web_subtitle_size(int w,int h){output.width=w;output.height=h;}
void web_subtitle_render(struct osd_state *osd,double pts){
    output.renders++;
    if(!osd){
        if(output.count||output.status){output.serial++;output.count=output.bytes=output.status=0;}
        last_change=-1;
        return;
    }
    if(output.width<1||output.height<1||output.width>MAX_WIDTH||output.height>MAX_HEIGHT){
        output.status=-1;
        return;
    }
    struct mp_osd_res res={.w=output.width,.h=output.height,.display_par=1};
    struct sub_bitmap_list *list=osd_render(osd,res,pts,OSD_DRAW_SUB_ONLY,mp_draw_sub_formats);
    if(list->change_id==last_change&&last_w==res.w&&last_h==res.h){talloc_free(list);return;}
    last_change=list->change_id;last_w=res.w;last_h=res.h;
    output.serial++;output.updates++;output.count=output.bytes=output.status=0;

    // Use mpv's own cache, lifetime and lock, as osd_draw_on_image_p does.
    mp_mutex_lock(&osd->lock);
    if(!osd->draw_cache)osd->draw_cache=mp_draw_sub_alloc(osd,osd->global);
    int active=0,modified=0;
    struct mp_rect rect,modified_rect;
    struct mp_image *image=osd->draw_cache?mp_draw_sub_overlay(osd->draw_cache,list,
        &rect,1,&active,&modified_rect,1,&modified):NULL;
    if(!image){output.status=-3;goto done;}
    composites++;
    if(!active)goto done;
    // mpv merges visible bounds for us; copy only that composed rectangle.
    if(active!=1||rect.x0<0||rect.y0<0||rect.x1>res.w||rect.y1>res.h||
       rect.x1<=rect.x0||rect.y1<=rect.y0){output.status=-2;goto done;}
    output.x=rect.x0;output.y=rect.y0;
    output.w=rect.x1-rect.x0;output.h=rect.y1-rect.y0;
    size_t row=(size_t)output.w*4;
    for(int y=0;y<output.h;y++)memcpy(output.data+y*row,
        image->planes[0]+(y+rect.y0)*image->stride[0]+rect.x0*4,row);
    output.count=1;output.bytes=row*output.h;
 done:
    mp_mutex_unlock(&osd->lock);
    talloc_free(list);
}
