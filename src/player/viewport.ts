// SPDX-License-Identifier: Apache-2.0
/** Browser-viewport expansion keeps the existing composed player in the top layer. */
export class ViewportExpansion {
  private restore?:()=>void;
  constructor(private host:HTMLElement,private shell:HTMLElement,private changed:()=>void){
    shell.addEventListener('toggle',()=>{if(this.restore&&!this.active)this.close(false);});
    shell.addEventListener('keydown',event=>{
      if(!this.active||event.key!=='Tab'||shell.querySelector('dialog:modal'))return;
      const controls:HTMLElement[]=[];
      const visit=(node:Element)=>{
        if(node instanceof HTMLElement&&node.inert)return;
        if(node instanceof HTMLSlotElement){const assigned=node.assignedElements({flatten:true});for(const child of assigned.length?assigned:Array.from(node.children))visit(child);return;}
        if(node instanceof HTMLElement&&node.matches('button,input,select,textarea,a[href],[tabindex]')&&node.tabIndex>=0&&!node.matches(':disabled')&&!node.inert&&node.getClientRects().length&&getComputedStyle(node).visibility==='visible')controls.push(node);
        for(const child of Array.from(node.shadowRoot?.children??node.children))visit(child);
      };
      visit(shell);
      let focused:Element|null=host.ownerDocument.activeElement;
      while(focused?.shadowRoot?.activeElement)focused=focused.shadowRoot.activeElement;
      event.preventDefault();
      if(controls.length){const index=controls.indexOf(focused as HTMLElement),next=index<0?(event.shiftKey?controls.length-1:0):(index+(event.shiftKey?-1:1)+controls.length)%controls.length;controls[next].focus();}
    });
  }
  get active(){return this.shell.hasAttribute('popover')&&this.shell.matches(':popover-open');}
  open(){
    if(this.active)return;
    // A native close can precede its asynchronous toggle event. Release that
    // expansion before taking a new snapshot of background state.
    if(this.restore)this.close(false);
    if(!this.host.isConnected||typeof this.shell.showPopover!=='function')throw Error('Browser-viewport expansion is unavailable');
    const doc=this.host.ownerDocument,focused=this.host.shadowRoot?.activeElement as HTMLElement|null;
    const inert=new Map<HTMLElement,boolean>(),overflow=new Map<HTMLElement,[string,string]>();
    this.restore=()=>{
      for(const [node,value]of inert)node.inert=value;
      for(const [node,[value,priority]]of overflow)if(node.style.getPropertyValue('overflow')==='hidden'){
        if(value)node.style.setProperty('overflow',value,priority);else node.style.removeProperty('overflow');
      }
    };
    try{
      this.shell.setAttribute('popover','manual');this.shell.showPopover();
      // Inert siblings along the host's ancestor chain, including shadow roots.
      // Nothing is reparented, so the player, its surface and subtitle layers survive.
      let node:Node=this.host;
      while(node.parentNode){
        const parent=node.parentNode;
        for(const sibling of Array.from(parent.childNodes))if(sibling!==node&&sibling instanceof HTMLElement){inert.set(sibling,sibling.inert);sibling.inert=true;}
        node=parent instanceof ShadowRoot?parent.host:parent;
      }
      for(const target of [doc.documentElement,doc.body])if(target){overflow.set(target,[target.style.getPropertyValue('overflow'),target.style.getPropertyPriority('overflow')]);target.style.setProperty('overflow','hidden');}
      (focused??this.shell.querySelector<HTMLElement>('#fullscreen'))?.focus({preventScroll:true});this.changed();
    }catch(error){this.close(false);throw error;}
  }
  close(focus=true){
    if(!this.restore)return;
    const restore=this.restore;this.restore=undefined;
    try{if(this.active)this.shell.hidePopover();}
    finally{
      this.shell.removeAttribute('popover');restore();this.changed();
      if(focus&&this.host.isConnected)this.shell.querySelector<HTMLElement>('#fullscreen')?.focus({preventScroll:true});
    }
  }
}

export const viewportStyles=`
#shell:popover-open{position:fixed;inset:0;margin:0;padding:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;border-radius:0;overflow:hidden;overscroll-behavior:contain;background:var(--demuxe-stage-background);color:var(--demuxe-foreground)}
#shell:popover-open .stage{height:100%;width:100%;max-height:none;min-height:0;aspect-ratio:auto}
#shell:popover-open::backdrop{background:var(--demuxe-stage-background)}
`;
