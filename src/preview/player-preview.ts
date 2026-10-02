// SPDX-License-Identifier: Apache-2.0
import type {PreviewController} from './controller.js';

/** Consumer operations on the preview lane owned by Player. */
export type PlayerPreview = Readonly<Pick<PreviewController,
  'getFrame'|'request'|'prefetch'|'addProvider'|'setProviders'|'clear'|'setStrategy'|'strategy'|'unload'|'setCacheLimits'|'cacheLimits'>> & {
  enabled:boolean;
  readonly diagnostics:Readonly<Omit<PreviewController['diagnostics'],'lastFailure'> & {
    lastFailure?:Readonly<{provider:string;kind:string}>;
  }>;
};

/** Keep owner controls and the controller itself out of the runtime facade. */
export function createPlayerPreview(controller:PreviewController):PlayerPreview {
  return Object.freeze({
    getFrame:controller.getFrame.bind(controller),
    request:controller.request.bind(controller),
    prefetch:controller.prefetch.bind(controller),
    addProvider:controller.addProvider.bind(controller),
    setProviders:controller.setProviders.bind(controller),
    clear:controller.clear.bind(controller),
    unload:controller.unload.bind(controller),
    setCacheLimits:controller.setCacheLimits.bind(controller),
    get cacheLimits(){return controller.cacheLimits;},
    setStrategy:controller.setStrategy.bind(controller),
    get strategy(){return controller.strategy;},
    get enabled(){return controller.enabled;},
    set enabled(value:boolean){controller.enabled=value;},
    get diagnostics(){
      const snapshot=controller.diagnostics;
      if(snapshot.lastFailure)Object.freeze(snapshot.lastFailure);
      return Object.freeze(snapshot);
    },
  });
}
