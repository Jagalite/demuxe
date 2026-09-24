// SPDX-License-Identifier: Apache-2.0
import {drawRetainedVideo} from './retained-video.js';

// Internal presentation contract: the mpv selected-PTS scheduler calls draw;
// the presenter never chooses a frame or advances playback time.
export class WebCodecsPresenter {
  constructor(canvas,context){this.canvas=canvas;this.context=context;}
  draw(frame,track){drawRetainedVideo(this.context,frame,this.canvas,track);}
  destroy(){}
}
