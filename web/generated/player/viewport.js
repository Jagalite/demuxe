// SPDX-License-Identifier: Apache-2.0
import { initialViewportLease, acquireViewportLease, releaseViewportLease, viewportLeaseCurrent } from '../internal/machine/viewport-lease.js';
import { PlayerError } from '../internal/errors.js';
const documentLeases = new WeakMap();
/** Browser-viewport expansion keeps the existing composed player in the top layer. */
export class ViewportExpansion {
    host;
    shell;
    changed;
    restore;
    listeners = new Set();
    get available() { return this.host.isConnected && typeof this.shell.showPopover === 'function'; }
    subscribe(listener) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
    notify() { this.changed(); for (const listener of [...this.listeners]) {
        try {
            listener();
        }
        catch { }
    } }
    constructor(host, shell, changed) {
        this.host = host;
        this.shell = shell;
        this.changed = changed;
        shell.addEventListener('toggle', () => { if (this.restore && !this.active)
            this.close(false); });
        shell.addEventListener('keydown', event => {
            if (!this.active || event.key !== 'Tab' || shell.querySelector('dialog:modal'))
                return;
            const controls = [];
            const visit = (node) => {
                if (node instanceof HTMLElement && node.inert)
                    return;
                if (node instanceof HTMLSlotElement) {
                    const assigned = node.assignedElements({ flatten: true });
                    for (const child of assigned.length ? assigned : Array.from(node.children))
                        visit(child);
                    return;
                }
                if (node instanceof HTMLElement && node.matches('button,input,select,textarea,a[href],[tabindex]') && node.tabIndex >= 0 && !node.matches(':disabled') && !node.inert && node.getClientRects().length && getComputedStyle(node).visibility === 'visible')
                    controls.push(node);
                for (const child of Array.from(node.shadowRoot?.children ?? node.children))
                    visit(child);
            };
            visit(shell);
            let focused = host.ownerDocument.activeElement;
            while (focused?.shadowRoot?.activeElement)
                focused = focused.shadowRoot.activeElement;
            event.preventDefault();
            if (controls.length) {
                const index = controls.indexOf(focused), next = index < 0 ? (event.shiftKey ? controls.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
                controls[next].focus();
            }
        });
    }
    get active() { return this.shell.hasAttribute('popover') && this.shell.matches(':popover-open'); }
    open() {
        if (this.active)
            return;
        // A native close can precede its asynchronous toggle event. Release that
        // expansion before taking a new snapshot of background state.
        if (this.restore)
            this.close(false);
        if (!this.host.isConnected || typeof this.shell.showPopover !== 'function')
            throw Error('Browser-viewport expansion is unavailable');
        const doc = this.host.ownerDocument, focused = this.host.shadowRoot?.activeElement;
        let lease = documentLeases.get(doc);
        if (!lease) {
            lease = { state: initialViewportLease() };
            documentLeases.set(doc, lease);
        }
        const admission = acquireViewportLease(lease.state);
        lease.state = admission.state;
        if (admission.id === null)
            throw new PlayerError('UNSUPPORTED_FEATURE', 'Another player owns browser-viewport expansion');
        const id = admission.id, owner = lease;
        const current = () => { if (!viewportLeaseCurrent(owner.state, id))
            throw new PlayerError('ABORTED', 'Browser-viewport expansion was retired'); };
        const inert = new Map(), overflow = new Map();
        const restore = () => {
            try {
                for (const [node, value] of inert)
                    node.inert = value;
                for (const [node, [value, priority]] of overflow)
                    if (node.style.getPropertyValue('overflow') === 'hidden') {
                        if (value)
                            node.style.setProperty('overflow', value, priority);
                        else
                            node.style.removeProperty('overflow');
                    }
            }
            finally {
                owner.state = releaseViewportLease(owner.state, id);
            }
        };
        this.restore = restore;
        try {
            this.shell.setAttribute('popover', 'manual');
            this.shell.showPopover();
            current();
            // Inert siblings along the host's ancestor chain, including shadow roots.
            // Nothing is reparented, so the player, its surface and subtitle layers survive.
            let node = this.host;
            while (node.parentNode) {
                const parent = node.parentNode;
                for (const sibling of Array.from(parent.childNodes))
                    if (sibling !== node && sibling instanceof HTMLElement) {
                        inert.set(sibling, sibling.inert);
                        sibling.inert = true;
                    }
                node = parent instanceof ShadowRoot ? parent.host : parent;
            }
            for (const target of [doc.documentElement, doc.body])
                if (target) {
                    overflow.set(target, [target.style.getPropertyValue('overflow'), target.style.getPropertyPriority('overflow')]);
                    target.style.setProperty('overflow', 'hidden');
                }
            (focused ?? this.shell.querySelector('#fullscreen'))?.focus({ preventScroll: true });
            current();
            this.notify();
        }
        catch (error) {
            if (this.restore === restore)
                this.close(false);
            throw error;
        }
    }
    close(focus = true) {
        if (!this.restore)
            return;
        const restore = this.restore;
        this.restore = undefined;
        try {
            if (this.active)
                this.shell.hidePopover();
        }
        finally {
            this.shell.removeAttribute('popover');
            restore();
            this.notify();
            if (focus && this.host.isConnected)
                this.shell.querySelector('#fullscreen')?.focus({ preventScroll: true });
        }
    }
}
export const viewportStyles = `
#shell:popover-open{position:fixed;inset:0;margin:0;padding:0;width:100vw;height:100dvh;max-width:none;max-height:none;border:0;border-radius:0;overflow:hidden;overscroll-behavior:contain;background:var(--demuxe-stage-background);color:var(--demuxe-foreground)}
#shell:popover-open .stage{height:100%;width:100%;max-height:none;min-height:0;aspect-ratio:auto}
#shell:popover-open::backdrop{background:var(--demuxe-stage-background)}
`;
