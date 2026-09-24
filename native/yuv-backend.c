// SPDX-License-Identifier: LGPL-2.1-or-later
// Qualified YUV path with mpv's RGB renderer as the per-frame fallback.
// Uses the existing libmpv scheduler/lock; image pointers never escape this call.
#include <emscripten.h>
#include "video/out/libmpv.h"
#include "sub/osd.h"
#include "video/mp_image.h"

struct priv {struct mp_rect src,dst,rgb_src,rgb_dst;bool rgb_rects_valid;struct mp_osd_res osd_rc;struct osd_state *osd;struct vo *vo;struct render_backend rgb;unsigned char *rotated_pixels;size_t rotated_capacity;};
extern const struct render_backend_fns render_backend_rgb;
extern void web_subtitle_size(int,int);
extern void web_subtitle_render(struct osd_state*,double);
EM_JS(void, draw_yuv,(int w,int h,int y,int u,int v,int ys,int us,int vs,int system,int full,float chroma_x,float chroma_y,int sx,int sy,int sw,int sh,int dx,int dy,int dw,int dh,double pts,int rotate),{
 Module.drawYUV({w,h,planes:[y,u,v],strides:[ys,us,vs],system,full,chroma:[chroma_x,chroma_y],src:[sx,sy,sw,sh],dst:[dx,dy,dw,dh],pts,rotate});
});
EM_JS(void, draw_rgb,(int ptr,int w,int h,int stride,double pts,int reason,int rotate,int swapped,int separate_osd),{Module.drawRGB(ptr,w,h,stride,pts,reason,rotate,swapped,separate_osd);});
enum yuv_rejection {
 YUV_OK, YUV_PIXEL_FORMAT, YUV_ODD_DIMENSIONS, YUV_SOURCE_CROP,
 YUV_ROTATION, YUV_MATRIX, YUV_RANGE, YUV_CHROMA_LOCATION,
 YUV_TRANSFER, YUV_PRIMARIES, YUV_PLANE_LAYOUT, YUV_SOURCE_COLOR_METADATA,
};
static enum yuv_rejection yuv_rejection(struct mp_image *i, struct mp_rect src){
 if(i->imgfmt!=IMGFMT_420P)return YUV_PIXEL_FORMAT;
 if(i->w<=0||i->h<=0||(i->w&1)||(i->h&1))return YUV_ODD_DIMENSIONS;
 struct mp_rect crop=i->params.crop;
 if(i->params.rotate)return YUV_ROTATION;
 if(((crop.x0||crop.y0||crop.x1||crop.y1)&&
     (crop.x0||crop.y0||crop.x1!=i->w||crop.y1!=i->h))||
    src.x0||src.y0||src.x1!=i->w||src.y1!=i->h)return YUV_SOURCE_CROP;
 if(i->params.repr.sys!=PL_COLOR_SYSTEM_BT_601&&
    i->params.repr.sys!=PL_COLOR_SYSTEM_BT_709)return YUV_MATRIX;
 if(i->params.repr.levels!=PL_COLOR_LEVELS_LIMITED&&
    i->params.repr.levels!=PL_COLOR_LEVELS_FULL)return YUV_RANGE;
 if(i->params.chroma_location!=PL_CHROMA_LEFT&&
    i->params.chroma_location!=PL_CHROMA_CENTER)return YUV_CHROMA_LOCATION;
 if(i->params.color.transfer!=PL_COLOR_TRC_BT_1886||
    pl_color_space_is_hdr(&i->params.color))return YUV_TRANSFER;
 if(i->params.color.primaries!=PL_COLOR_PRIM_BT_601_525&&
    i->params.color.primaries!=PL_COLOR_PRIM_BT_601_625&&
    i->params.color.primaries!=PL_COLOR_PRIM_BT_709)return YUV_PRIMARIES;
 // The decoder wrapper resolves absent legacy color tags with mpv's defaults.
 // Preserve that measured policy, but do not admit an explicit, unsupported
 // source declaration which mpv may have normalized before this callback.
 if((i->params.sys_orig!=PL_COLOR_SYSTEM_UNKNOWN&&
     i->params.sys_orig!=PL_COLOR_SYSTEM_BT_601&&
     i->params.sys_orig!=PL_COLOR_SYSTEM_BT_709)||
    (i->params.primaries_orig!=PL_COLOR_PRIM_UNKNOWN&&
     i->params.primaries_orig!=PL_COLOR_PRIM_BT_601_525&&
     i->params.primaries_orig!=PL_COLOR_PRIM_BT_601_625&&
     i->params.primaries_orig!=PL_COLOR_PRIM_BT_709)||
    (i->params.transfer_orig!=PL_COLOR_TRC_UNKNOWN&&
     i->params.transfer_orig!=PL_COLOR_TRC_BT_1886)||
    i->icc_profile)return YUV_SOURCE_COLOR_METADATA;
 if(!i->planes[0]||!i->planes[1]||!i->planes[2]||
    i->stride[0]<i->w||i->stride[1]<i->w/2||i->stride[2]<i->w/2)
   return YUV_PLANE_LAYOUT;
 return YUV_OK;
}
static int init(struct render_backend *ctx,mpv_render_param *params){
 char *api=get_mpv_render_param(params,MPV_RENDER_PARAM_API_TYPE,NULL);
 if(!api||strcmp(api,MPV_RENDER_API_TYPE_SW))return MPV_ERROR_NOT_IMPLEMENTED;
 ctx->priv=talloc_zero(NULL,struct priv);struct priv*p=ctx->priv;p->rgb=(struct render_backend){.global=ctx->global,.log=ctx->log,.fns=&render_backend_rgb};return render_backend_rgb.init(&p->rgb,params);
}
static bool check_format(struct render_backend *ctx,int fmt){return render_backend_rgb.check_format(&((struct priv*)ctx->priv)->rgb,fmt);}
static void reconfig(struct render_backend *ctx,struct mp_image_params *p){render_backend_rgb.reconfig(&((struct priv*)ctx->priv)->rgb,p);}
static void reset(struct render_backend *ctx){render_backend_rgb.reset(&((struct priv*)ctx->priv)->rgb);}
static void update_external(struct render_backend *ctx,struct vo *vo){struct priv*p=ctx->priv;p->vo=vo;p->osd=vo?vo->osd:NULL;render_backend_rgb.update_external(&p->rgb,vo);}
static void resize(struct render_backend *ctx,struct mp_rect *src,struct mp_rect *dst,struct mp_osd_res *osd){struct priv*p=ctx->priv;p->src=*src;p->dst=*dst;p->osd_rc=*osd;p->rgb_rects_valid=false;render_backend_rgb.resize(&p->rgb,src,dst,osd);}
static int target(struct render_backend *ctx,mpv_render_param *params,int*w,int*h){int*s=get_mpv_render_param(params,MPV_RENDER_PARAM_SW_SIZE,NULL);if(!s)return MPV_ERROR_INVALID_PARAMETER;*w=s[0];*h=s[1];return 0;}
static int render(struct render_backend *ctx,mpv_render_param *params,struct vo_frame *frame){
 struct priv*p=ctx->priv;struct mp_image*i=frame->current;if(!i)return 0;
 int sys=i->params.repr.sys;
 enum yuv_rejection reason=yuv_rejection(i,p->src);
 if(reason!=YUV_OK){
   // mpv's libmpv VO reports the source rectangle in rotated coordinates,
   // while its CPU RGB scaler crops the unrotated decoded image.
   struct mp_rect rgb_src=p->src;
   struct mp_rect rgb_dst=p->dst;
   int*sz=get_mpv_render_param(params,MPV_RENDER_PARAM_SW_SIZE,NULL);
   int rotation=(i->params.rotate%360+360)%360;
   int swapped=rotation==90||rotation==270;
   int render_size[2]={swapped?sz[1]:sz[0],swapped?sz[0]:sz[1]};
   if(rotation&&rotation%90==0){
     mp_rect_rotate(&rgb_src,i->w,i->h,360-rotation);
     int w=sz[0],h=sz[1];
     if(rotation==90)rgb_dst=(struct mp_rect){p->dst.y0,w-p->dst.x1,p->dst.y1,w-p->dst.x0};
     if(rotation==180)rgb_dst=(struct mp_rect){w-p->dst.x1,h-p->dst.y1,w-p->dst.x0,h-p->dst.y0};
     if(rotation==270)rgb_dst=(struct mp_rect){h-p->dst.y1,p->dst.x0,h-p->dst.y0,p->dst.x1};
   }
   if(!p->rgb_rects_valid||!mp_rect_equals(&p->rgb_src,&rgb_src)||!mp_rect_equals(&p->rgb_dst,&rgb_dst)){
     render_backend_rgb.resize(&p->rgb,&rgb_src,&rgb_dst,&p->osd_rc);
     p->rgb_src=rgb_src;p->rgb_dst=rgb_dst;p->rgb_rects_valid=true;
   }
   size_t*output_stride=get_mpv_render_param(params,MPV_RENDER_PARAM_SW_STRIDE,NULL);
   void*output_ptr=get_mpv_render_param(params,MPV_RENDER_PARAM_SW_POINTER,NULL);
   size_t render_stride=(size_t)render_size[0]*4;
   void*render_ptr=output_ptr;
   mpv_render_param rotated_params[]={
     {MPV_RENDER_PARAM_SW_SIZE,render_size},{MPV_RENDER_PARAM_SW_FORMAT,"rgb0"},
     {MPV_RENDER_PARAM_SW_STRIDE,&render_stride},{MPV_RENDER_PARAM_SW_POINTER,NULL},{0},
   };
   if(swapped){
     size_t needed=render_stride*render_size[1];
     if(p->rotated_capacity<needed){
       void*next=realloc(p->rotated_pixels,needed);
       if(!next)return MPV_ERROR_NOMEM;
       p->rotated_pixels=next;p->rotated_capacity=needed;
     }
     render_ptr=p->rotated_pixels;
     rotated_params[3].data=render_ptr;
   }
   // mpv's RGB backend draws OSD into its output. Keep that behavior for
   // ordinary fallback, but compose OSD after the texture rotation so text
   // stays upright on rotated sources.
   if(rotation)render_backend_rgb.update_external(&p->rgb,NULL);
   int r=render_backend_rgb.render(&p->rgb,swapped?rotated_params:params,frame);
   if(rotation)render_backend_rgb.update_external(&p->rgb,p->vo);
   if(r<0)return r;
   if(rotation){web_subtitle_size(p->osd_rc.w,p->osd_rc.h);web_subtitle_render(p->osd,i->pts);}
   draw_rgb((intptr_t)render_ptr,render_size[0],render_size[1],swapped?render_stride:*output_stride,i->pts,reason,rotation,swapped,!!rotation);return 0;}
 web_subtitle_size(p->osd_rc.w,p->osd_rc.h);web_subtitle_render(p->osd,i->pts);
 float chroma_x,chroma_y;pl_chroma_location_offset(i->params.chroma_location,&chroma_x,&chroma_y);
 draw_yuv(i->w,i->h,(intptr_t)i->planes[0],(intptr_t)i->planes[1],(intptr_t)i->planes[2],i->stride[0],i->stride[1],i->stride[2],sys==PL_COLOR_SYSTEM_BT_709,i->params.repr.levels==PL_COLOR_LEVELS_FULL,
 chroma_x,chroma_y,
 p->src.x0,p->src.y0,mp_rect_w(p->src),mp_rect_h(p->src),p->dst.x0,p->dst.y0,mp_rect_w(p->dst),mp_rect_h(p->dst),i->pts,i->params.rotate);
 return 0;
}
static void destroy(struct render_backend *ctx){struct priv*p=ctx->priv;if(p){render_backend_rgb.destroy(&p->rgb);talloc_free(p->rgb.priv);free(p->rotated_pixels);}}
const struct render_backend_fns render_backend_sw={.init=init,.check_format=check_format,.reconfig=reconfig,.reset=reset,.update_external=update_external,.resize=resize,.get_target_size=target,.render=render,.destroy=destroy};
