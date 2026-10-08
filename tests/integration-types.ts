// SPDX-License-Identifier: Apache-2.0
import {Player} from 'demuxe';
import type {PlayerPresentationSnapshot,PlayerViewportExpansionAdapter} from 'demuxe';
import type {PlaybackControl,PlayerAPI} from 'demuxe/contracts';
import {bindPlayer,subscribeSelector,createPlayerBinding} from 'demuxe/integration';
import {registerMediaElement,DemuxeMediaElement} from 'demuxe/media-element';
import {registerVideojsTech} from 'demuxe/adapters/videojs';
declare const host:HTMLElement;
const player=new Player(host);
declare const expansion:PlayerViewportExpansionAdapter;
player.presentation.setViewportExpansionAdapter(expansion);
const stopPresentation=player.presentation.subscribe((state:PlayerPresentationSnapshot)=>{const expanded:boolean=state.viewportExpanded;void expanded;});
player.presentation.setMediaSessionMetadata({title:'Movie',artwork:[{src:'/cover.png'}]},1);
void stopPresentation;
// @ts-expect-error Metadata updates must identify their source.
player.presentation.setMediaSessionMetadata({title:'Unscoped'});
const controls:PlaybackControl=player;
const api:PlayerAPI=player;
const binding=bindPlayer(player);
const stop=subscribeSelector(binding,state=>state.volume,value=>console.log(value));
const owned=createPlayerBinding(host);
registerMediaElement();new DemuxeMediaElement().bind(player);
void api;void controls;void stop;void owned;void registerVideojsTech;
// @ts-expect-error Borrowed control bindings cannot replace application sources.
binding.open('/movie.mp4');
// @ts-expect-error Restricted playback controls expose no raw mpv property map.
controls.properties;
