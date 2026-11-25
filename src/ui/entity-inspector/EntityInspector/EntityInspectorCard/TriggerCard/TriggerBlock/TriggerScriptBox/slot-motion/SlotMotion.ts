import { easeInOut } from './easeInOut.ts';

// How "add a block" slots open and close in one trigger's script (design/controls.md, v4 fix 4, Adding a
// block anywhere; the mockup's hover code in design/mockups/triggers.html). Nothing moves for DELAY_MS after
// the mouse asks for a change, so a mouse passing over blocks doesn't push them. Then a slot takes 400 ms:
// the blocks move apart to make its room (MOVE_MS), then it fades in (FADE_MS); closing runs the other way.
// The script keeps the height it has with no slot open, and the hovered block never moves: when a slot opens
// or closes above it, the script scrolls by as much on every frame, and where it can't scroll that far an
// empty strip above or below the blocks makes the room. An open slot clipped by the view is scrolled into it.
// Once the mouse has left, the script glides back to its start over SETTLE_MS.
//
// It works on the script's elements directly, one animation frame at a time, since the scroll that keeps the
// hovered block still has to follow each frame's layout before it is painted.
export const DELAY_MS = 200;
export const MOVE_MS = 200;
export const FADE_MS = 200;
export const SETTLE_MS = 400;

const OPEN_MS = MOVE_MS + FADE_MS;
// How fast the scroll to a clipped slot closes in: about what's left of the way every REVEAL_MS.
const REVEAL_MS = 60;
// How much room a revealed slot keeps from the view's edge.
const REVEAL_MARGIN_PX = 4;
// The slot's tooth hangs this far below its room into the block under it.
const TOOTH_PX = 6;
const FIRST_FRAME_MS = 16;
// The most one frame moves a slot. A slow frame (the slot's first layout, a busy page) would otherwise jump
// it most of the way open in one step, and it would look instant; a slow page runs the motion slower instead.
const MAX_FRAME_MS = 34;

type Ask = {
    gap: number | undefined;
    isInside: boolean;
};

type Settling = {
    start: number;
    scroll: number;
    rooms: number[];
};

export class SlotMotion {
    private script: HTMLElement | null = null;
    private hoveredGap: number | undefined = undefined;
    private isMouseInside = false;
    private menuGap: number | undefined = undefined;
    private askedAt = 0;
    private asked: Ask = { gap: undefined, isInside: false };
    private wanted: Ask = { gap: undefined, isInside: false };
    private anchor: Element | null = null;
    private anchorTop = 0;
    private settling: Settling | undefined = undefined;
    private readonly slotTimes = new Map<Element, number>();
    private frameId: number | undefined = undefined;
    private lastFrame: number | undefined = undefined;

    attach(script: HTMLElement | null) {
        this.script = script;
    }

    dispose() {
        if (this.frameId !== undefined) {
            cancelAnimationFrame(this.frameId);
        }
        this.frameId = undefined;
        this.script = null;
    }

    // The mouse is on the script: on a band asking for a gap's slot (undefined for none), over `hovered`, the
    // block or slot kept still while slots move (null over empty space).
    hover(gap: number | undefined, hovered: Element | null) {
        this.hoveredGap = gap;
        this.isMouseInside = true;
        if (hovered !== this.anchor) {
            this.anchor = hovered;
            this.anchorTop = topOf(hovered);
        }
        this.askAgain();
    }

    leave() {
        this.hoveredGap = undefined;
        this.isMouseInside = false;
        this.anchor = null;
        this.askAgain();
    }

    // A slot's add menu keeps its slot open, wherever the mouse goes.
    holdOpen(gap: number | undefined) {
        this.menuGap = gap;
        this.askAgain();
    }

    // A block was added at the open slot and takes its place: every slot closes at once and the script is
    // back at its start, so the new block shows where the slot was. Until the mouse moves, nothing is asked.
    added() {
        this.menuGap = undefined;
        this.hoveredGap = undefined;
        this.anchor = null;
        this.asked = { gap: undefined, isInside: this.isMouseInside };
        this.wanted = this.asked;
        this.settling = undefined;
        for (const slot of this.slots()) {
            this.slotTimes.set(slot, 0);
            this.drawSlot(slot, 0);
        }
        this.setRooms([0, 0]);
        if (this.script !== null) {
            this.script.scrollTop = 0;
            this.script.style.height = '';
        }
    }

    private askAgain() {
        const gap = this.menuGap ?? this.hoveredGap;
        const isInside = this.isMouseInside || this.menuGap !== undefined;
        const isSame = gap === this.asked.gap && isInside === this.asked.isInside;
        if (!isSame) {
            this.asked = { gap, isInside };
            this.askedAt = performance.now();
        }
        this.startFrames();
    }

    private startFrames() {
        if (this.frameId !== undefined) return;

        this.frameId = requestAnimationFrame(this.frame);
    }

    // The frame's own timestamp is not used: it may count from another start than performance.now(), which
    // times the mouse's asks.
    private readonly frame = () => {
        this.frameId = undefined;
        if (this.script === null) return;

        const now = performance.now();
        let elapsed = FIRST_FRAME_MS;
        if (this.lastFrame !== undefined) {
            elapsed = Math.min(MAX_FRAME_MS, now - this.lastFrame);
        }
        this.lastFrame = now;

        const isMoving = this.step(this.script, now, elapsed);
        if (isMoving) {
            this.frameId = requestAnimationFrame(this.frame);
        } else {
            this.lastFrame = undefined;
        }
    };

    // Moves every slot one frame toward open or closed, keeps the hovered block still, shows a clipped slot
    // and glides back a script the mouse has left. Returns whether anything still has to move.
    private step(script: HTMLElement, now: number, elapsed: number) {
        const isWaiting = !sameAsk(this.asked, this.wanted);
        if (isWaiting && now - this.askedAt >= DELAY_MS) {
            this.wanted = this.asked;
        }
        let isMoving = !sameAsk(this.asked, this.wanted);

        isMoving = this.moveSlots(script, elapsed) || isMoving;

        const anchor = this.anchor;
        const isAnchorShown = anchor !== null && anchor.isConnected && anchor.getClientRects().length > 0;
        if (isAnchorShown) {
            this.keepInPlace(script, anchor);
            isMoving = this.reveal(script, anchor, elapsed) || isMoving;
        }
        if (this.wanted.isInside || isAnchorShown) {
            this.settling = undefined;
        } else {
            isMoving = this.settle(script, now) || isMoving;
        }

        this.releaseHeight(script);

        return isMoving;
    }

    private moveSlots(script: HTMLElement, elapsed: number) {
        let isMoving = false;

        for (const slot of this.slots()) {
            const time = this.slotTimes.get(slot) ?? 0;
            const isWanted = this.wanted.gap !== undefined && gapOf(slot) === this.wanted.gap;
            const target = isWanted ? OPEN_MS : 0;
            if (time === target) continue;

            // The script keeps the height it had with no slot open, so an opening slot scrolls it.
            if (script.style.height === '') {
                script.style.height = `${script.offsetHeight}px`;
            }
            let next = Math.max(target, time - elapsed);
            if (target > time) {
                next = Math.min(target, time + elapsed);
            }
            this.slotTimes.set(slot, next);
            this.drawSlot(slot, next);
            isMoving = isMoving || next !== target;
        }

        return isMoving;
    }

    // Draws a slot `time` ms open: its room grows over MOVE_MS, then it fades in over FADE_MS, both eased. The
    // block above it shows its tooth while the slot shows.
    private drawSlot(slot: HTMLElement, time: number) {
        const body = slot.firstElementChild as HTMLElement | null;
        const fade = Math.max(0, Math.min(1, (time - MOVE_MS) / FADE_MS));
        this.markBlocksAbove(slot, fade > 0);

        if (time === 0) {
            slot.dataset['shown'] = 'false';
            slot.style.height = '';
            slot.style.overflow = '';
            if (body !== null) {
                body.style.opacity = '';
            }
            return;
        }

        slot.dataset['shown'] = 'true';
        const grown = Math.min(1, time / MOVE_MS);
        const fullHeight = fullHeightOf(slot);
        let height = '';
        let overflow = '';
        if (grown < 1) {
            const eased = easeInOut(grown);
            height = `${Math.round(fullHeight * eased)}px`;
            overflow = 'hidden';
        }
        slot.style.height = height;
        slot.style.overflow = overflow;
        const opacity = easeInOut(fade);
        if (body !== null) {
            body.style.opacity = String(opacity);
        }
    }

    private markBlocksAbove(slot: HTMLElement, isOpen: boolean) {
        if (this.script === null) return;

        const gap = slot.dataset['gap'];
        const above = this.script.querySelectorAll<HTMLElement>(`.script-block[data-gap-below="${gap}"]`);
        for (const block of above) {
            block.dataset['open'] = String(isOpen);
        }
    }

    // Scrolls the script so the hovered block's top is back where it was. When the script can't scroll that
    // far, an empty strip above or below its blocks grows by what's missing; out of view, the strips shrink.
    private keepInPlace(script: HTMLElement, anchor: Element) {
        const [topRoom, bottomRoom] = this.rooms();
        if (topRoom === undefined || bottomRoom === undefined) return;

        // Not scrollHeight: while the blocks are shorter than the script's least height, a strip growing below
        // them fills empty space first and adds no scroll, so the hovered block moved, then jumped back.
        const maxScroll = () => contentBottomOf(script, bottomRoom) - script.clientHeight;
        const moved = topOf(anchor) - this.anchorTop;
        const shortBelow = script.scrollTop + moved - maxScroll();
        if (moved > 0 && shortBelow > 0) {
            setHeight(bottomRoom, bottomRoom.offsetHeight + shortBelow);
        }
        const shortAbove = -(script.scrollTop + moved);
        if (moved < 0 && shortAbove > 0) {
            setHeight(topRoom, topRoom.offsetHeight + shortAbove);
        }
        const stillMoved = topOf(anchor) - this.anchorTop;
        script.scrollTop += stillMoved;

        const hiddenTop = Math.min(topRoom.offsetHeight, script.scrollTop);
        setHeight(topRoom, topRoom.offsetHeight - hiddenTop);
        script.scrollTop -= hiddenTop;
        const hiddenBottom = Math.max(0, Math.min(bottomRoom.offsetHeight, maxScroll() - script.scrollTop));
        setHeight(bottomRoom, bottomRoom.offsetHeight - hiddenBottom);
    }

    // When the open slot would be clipped by the view, above or below, the script scrolls smoothly by what's
    // needed to show all of it, the hovered block moving with it and staying where that leaves it.
    private reveal(script: HTMLElement, anchor: Element, elapsed: number) {
        const slot = this.wantedSlot();
        if (slot === undefined || slot.dataset['shown'] !== 'true') return false;

        const view = script.getBoundingClientRect();
        const viewBottom = view.top + script.clientHeight;
        const slotRect = slot.getBoundingClientRect();
        const slotBottom = slotRect.bottom + TOOTH_PX;
        const clippedBelow = slotBottom + REVEAL_MARGIN_PX - viewBottom;
        const clippedAbove = view.top - (slotRect.top - REVEAL_MARGIN_PX);
        let need = 0;
        if (clippedBelow > 0.5) {
            need = clippedBelow;
        } else if (clippedAbove > 0.5) {
            need = -clippedAbove;
        }
        if (need === 0) return false;

        const share = 1 - Math.exp(-elapsed / REVEAL_MS);
        const distance = Math.max(0.5, Math.abs(need) * share);
        const before = script.scrollTop;
        script.scrollTop += Math.sign(need) * distance;
        if (script.scrollTop === before) return false;

        this.anchorTop = topOf(anchor);
        return true;
    }

    // Glides a script the mouse has left back to its start over SETTLE_MS: no scroll, no empty strips.
    private settle(script: HTMLElement, now: number) {
        const rooms = this.rooms();
        const heights = rooms.map((room) => room.offsetHeight);
        if (this.settling === undefined) {
            const isAtStart = script.scrollTop === 0 && heights.every((height) => height === 0);
            if (isAtStart) return false;

            this.settling = { start: now, scroll: script.scrollTop, rooms: heights };
        }

        const from = this.settling;
        const progress = Math.min(1, (now - from.start) / SETTLE_MS);
        const left = 1 - easeInOut(progress);
        const roomHeights = from.rooms.map((height) => height * left);
        this.setRooms(roomHeights);
        script.scrollTop = from.scroll * left;
        if (left > 0) return true;

        this.settling = undefined;
        return false;
    }

    // Back at its start with every slot shut, the script takes its blocks' height again.
    private releaseHeight(script: HTMLElement) {
        const isAnySlotShown = this.slots().some((slot) => (this.slotTimes.get(slot) ?? 0) > 0);
        const hasRoom = this.rooms().some((room) => room.offsetHeight > 0);
        const isAtStart = script.scrollTop === 0;
        if (isAnySlotShown || hasRoom || !isAtStart) return;

        script.style.height = '';
    }

    private wantedSlot() {
        if (this.wanted.gap === undefined) return undefined;

        return this.slots().find((slot) => gapOf(slot) === this.wanted.gap);
    }

    private slots() {
        if (this.script === null) return [];

        return [...this.script.querySelectorAll<HTMLElement>('.script-slot')];
    }

    private rooms() {
        if (this.script === null) return [];

        return [...this.script.querySelectorAll<HTMLElement>(':scope > .room')];
    }

    private setRooms(heights: readonly number[]) {
        this.rooms().forEach((room, index) => {
            setHeight(room, heights[index] ?? 0);
        });
    }
}

function sameAsk(one: Ask, other: Ask) {
    return one.gap === other.gap && one.isInside === other.isInside;
}

function gapOf(slot: HTMLElement) {
    return Number(slot.dataset['gap']);
}

function topOf(element: Element | null) {
    if (element === null) return 0;

    return element.getBoundingClientRect().top;
}

function setHeight(element: HTMLElement, height: number) {
    element.style.height = `${height}px`;
}

// Where the script's content ends, from the top of what it scrolls: the strip below the blocks and the
// script's bottom padding. It can be above the view's bottom, where scrollHeight would say the view's height.
function contentBottomOf(script: HTMLElement, bottomRoom: HTMLElement) {
    const scrolledTop = script.getBoundingClientRect().top + script.clientTop - script.scrollTop;
    const paddingBottom = parseFloat(getComputedStyle(script).paddingBottom);

    return bottomRoom.getBoundingClientRect().bottom - scrolledTop + paddingBottom;
}

// A slot's room when open: its body's height, less the tooth that hangs into the block below.
function fullHeightOf(slot: HTMLElement) {
    const body = slot.firstElementChild as HTMLElement | null;
    if (body === null) return 0;

    return body.offsetHeight - TOOTH_PX;
}
