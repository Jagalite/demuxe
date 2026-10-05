// SPDX-License-Identifier: Apache-2.0
import {Player,PreviewController,type PlayerPreview,PlayerPresentation,type PlayerOptions,type StartupEscalationOptions} from 'demuxe';
import {DemuxePlayerElement} from 'demuxe/player';
import type {PlaybackRuntime,PlaybackControl,PlayerAPI} from 'demuxe/contracts';
import {bindPlayer,subscribeSelector} from 'demuxe/integration';
import {DemuxeMediaElement,registerMediaElement} from 'demuxe/media-element';
import {registerVideojsTech} from 'demuxe/adapters/videojs';
import {ProviderAcquisition,parseProviderDeployment,audioRepairRecipe} from 'demuxe/components';
declare const player:Player;
const runtime:PlaybackRuntime=player,control:PlaybackControl=runtime,api:PlayerAPI=player;
const binding=bindPlayer(runtime);binding.play();binding.pause();binding.seek(2);binding.dispose();
subscribeSelector(control,s=>s.volume,value=>value.toFixed(2));
const preview:PlayerPreview=player.preview;
preview.getFrame({time:1,width:160});preview.setStrategy({type:'on-demand'});preview.unload({start:0,end:10});
preview.setStrategy({type:'demuxe'});
// @ts-expect-error source ownership is not consumer-facing
preview.setSourceIdentity('foreign');
// @ts-expect-error destroying the preview belongs to the player
preview.destroy();
player.setBuffering({profile:'resilient',aheadSeconds:12});player.getBuffering().requested.profile;
player.seek(2,{policy:'latest',signal:new AbortController().signal});
player.addEventListener('statechange',event=>event.detail.playbackIntent);
player.addEventListener('modechange',event=>event.detail.phase);
// @ts-expect-error mode lifecycle details are not state snapshots
player.addEventListener('modechange',event=>event.detail.currentTime);
// @ts-expect-error unsupported seek policy
player.seek(2,{policy:'discard'});
declare const element:DemuxePlayerElement,media:DemuxeMediaElement;
element.open(new Blob());element.close();element.destroy();media.bind(runtime);media.dispose();
const presentation:PlayerPresentation=player.presentation;presentation.setMediaSessionEnabled(false);
void [api,PreviewController,registerMediaElement,registerVideojsTech,ProviderAcquisition,parseProviderDeployment,audioRepairRecipe];

const escalation:StartupEscalationOptions={prefetchAfterMs:100,switchAfterMs:200};
const startupOptions:PlayerOptions={startupEscalation:escalation};
const disabledStartup:PlayerOptions={startupEscalation:false};
// @ts-expect-error escalation delays must be numeric
const invalidStartup:StartupEscalationOptions={prefetchAfterMs:'100'};
void [startupOptions,disabledStartup,invalidStartup];
