// SPDX-License-Identifier: Apache-2.0
import type {Shaka} from './shaka-api.js';

/** Extend the pinned upstream manager so its bandwidth estimation, hysteresis,
 * timers, resize handling, CMSD and teardown retain one owner. */
export function switchingAbrFactory(runtime:typeof Shaka,
  choose:(recommended:Shaka.extern.Variant,variants:readonly Shaka.extern.Variant[],estimate:number)=>Readonly<{variant:Shaka.extern.Variant;urgency:'buffered'|'responsive'}>|null,
  transition:(variant:Shaka.extern.Variant,urgency:'buffered'|'responsive')=>Readonly<{clearBuffer:boolean;safeMargin:number}>|null,
):()=>Shaka.abr.SimpleAbrManager {
  return ()=>new class extends runtime.abr.SimpleAbrManager {
    private candidates:Shaka.extern.Variant[]=[];
    private choice:ReturnType<typeof choose>=null;
    override setVariants(variants:Shaka.extern.Variant[],isLowLatency?:boolean){this.candidates=[...variants];return super.setVariants(variants,isLowLatency);}
    override chooseVariant(preferFastSwitching?:boolean){
      const recommended=super.chooseVariant(preferFastSwitching);
      this.choice=recommended?choose(recommended,this.candidates,this.getBandwidthEstimate()):null;
      return this.choice?.variant??null;
    }
    override init(callback:Shaka.extern.SwitchCallback,disable:(...args:unknown[])=>unknown){
      super.init(variant=>{
        const settings=transition(variant,this.choice?.variant===variant?this.choice.urgency:'buffered');
        if(settings)callback(variant,settings.clearBuffer,settings.safeMargin);
      },disable);
    }
    override stop(){this.candidates=[];this.choice=null;super.stop();}
    override release(){this.candidates=[];this.choice=null;super.release();}
  }();
}
