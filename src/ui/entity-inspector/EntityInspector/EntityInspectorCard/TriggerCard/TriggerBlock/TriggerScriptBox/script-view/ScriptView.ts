import { barThumb, scrollPerDragPixel } from './barThumb.ts';
import type { BarMeasure } from './barThumb.ts';
import { edgeFadeMask } from './edgeFadeMask.ts';

// The script's own scrollbars and edge fades (design/controls.md, v4 fix 4; the mockup's drawBars, fadeEdges
// and thumb dragging in design/mockups/triggers.html). The bars are thin rounded bars drawn over the blocks, so
// they take no room: the vertical one appearing can't narrow the script and call up the horizontal one. A bar
// shows only when the script can scroll its way; with both, each stops short of the corner. Its thumb can be
// dragged. Each edge hiding blocks fades them (edgeFadeMask).
//
// It redraws on every scroll and whenever the script or anything in it changes size, which covers the blocks
// changing, a slot opening and SlotMotion's empty strips growing.

// A bar's thickness while not hovered: the other bar's track ends this far short of the corner.
const BAR_PX = 8;
// Below this many pixels of overflow the script counts as not scrolling that way.
const OVERFLOW_SLACK_PX = 1;

export type BarAxis = 'vertical' | 'horizontal';

type Drag = {
    bar: HTMLElement;
    axis: BarAxis;
    pointerId: number;
    fromPointer: number;
    fromScroll: number;
};

export class ScriptView {
    private script: HTMLElement | null = null;
    private verticalBar: HTMLElement | null = null;
    private horizontalBar: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | undefined = undefined;
    private drag: Drag | undefined = undefined;

    attach(script: HTMLElement | null, verticalBar: HTMLElement | null, horizontalBar: HTMLElement | null) {
        this.dispose();
        if (script === null || verticalBar === null || horizontalBar === null) return;

        this.script = script;
        this.verticalBar = verticalBar;
        this.horizontalBar = horizontalBar;
        script.addEventListener('scroll', this.draw);
        for (const bar of [verticalBar, horizontalBar]) {
            bar.addEventListener('pointerdown', this.startDrag);
            bar.addEventListener('pointermove', this.moveDrag);
            bar.addEventListener('pointerup', this.endDrag);
            bar.addEventListener('pointercancel', this.endDrag);
        }

        this.resizeObserver = new ResizeObserver(this.draw);
        this.resizeObserver.observe(script);
        for (const child of script.children) {
            this.resizeObserver.observe(child);
        }
        this.draw();
    }

    dispose() {
        this.resizeObserver?.disconnect();
        this.resizeObserver = undefined;
        this.script?.removeEventListener('scroll', this.draw);
        for (const bar of [this.verticalBar, this.horizontalBar]) {
            bar?.removeEventListener('pointerdown', this.startDrag);
            bar?.removeEventListener('pointermove', this.moveDrag);
            bar?.removeEventListener('pointerup', this.endDrag);
            bar?.removeEventListener('pointercancel', this.endDrag);
        }
        this.drag = undefined;
        this.script = null;
        this.verticalBar = null;
        this.horizontalBar = null;
    }

    readonly draw = () => {
        const script = this.script;
        if (script === null) return;

        const canScrollDown = script.scrollHeight > script.clientHeight + OVERFLOW_SLACK_PX;
        const canScrollAcross = script.scrollWidth > script.clientWidth + OVERFLOW_SLACK_PX;
        this.placeBar('vertical', canScrollDown, canScrollAcross);
        this.placeBar('horizontal', canScrollAcross, canScrollDown);
        this.fadeEdges();
    };

    private placeBar(axis: BarAxis, isShown: boolean, otherIsShown: boolean) {
        const bar = this.barOf(axis);
        if (bar === null || this.script === null) return;

        bar.classList.toggle('shown', isShown);
        if (!isShown) return;

        const measure = this.measure(axis, otherIsShown);
        const thumb = barThumb(measure);
        if (axis === 'vertical') {
            bar.style.top = `${this.script.offsetTop + thumb.offset}px`;
            bar.style.height = `${thumb.length}px`;
        } else {
            bar.style.left = `${this.script.offsetLeft + thumb.offset}px`;
            bar.style.width = `${thumb.length}px`;
        }
    }

    private measure(axis: BarAxis, otherIsShown: boolean): BarMeasure {
        const script = this.requireScript();
        const cornerGap = otherIsShown ? BAR_PX : 0;

        if (axis === 'vertical') {
            const view = script.clientHeight;
            return { view, content: script.scrollHeight, scroll: script.scrollTop, track: view - cornerGap };
        }
        const view = script.clientWidth;
        return { view, content: script.scrollWidth, scroll: script.scrollLeft, track: view - cornerGap };
    }

    private fadeEdges() {
        const script = this.requireScript();
        const hidden = {
            top: script.scrollTop,
            bottom: script.scrollHeight - script.clientHeight - script.scrollTop,
            left: script.scrollLeft,
            right: script.scrollWidth - script.clientWidth - script.scrollLeft,
        };
        const mask = edgeFadeMask(hidden);

        script.style.maskImage = mask?.image ?? '';
        script.style.maskComposite = mask?.composite ?? '';
    }

    private readonly startDrag = (event: PointerEvent) => {
        const bar = event.currentTarget;
        if (!(bar instanceof HTMLElement)) return;

        event.preventDefault();
        const axis: BarAxis = bar === this.verticalBar ? 'vertical' : 'horizontal';
        const script = this.requireScript();
        bar.setPointerCapture(event.pointerId);
        bar.classList.add('dragged');

        let fromPointer = event.clientX;
        let fromScroll = script.scrollLeft;
        if (axis === 'vertical') {
            fromPointer = event.clientY;
            fromScroll = script.scrollTop;
        }
        this.drag = { bar, axis, pointerId: event.pointerId, fromPointer, fromScroll };
    };

    private readonly moveDrag = (event: PointerEvent) => {
        const drag = this.drag;
        if (drag === undefined || event.pointerId !== drag.pointerId) return;

        const script = this.requireScript();
        const isVertical = drag.axis === 'vertical';
        const otherBar = this.barOf(isVertical ? 'horizontal' : 'vertical');
        const otherIsShown = otherBar?.classList.contains('shown') ?? false;
        const measure = this.measure(drag.axis, otherIsShown);
        const thumbLength = isVertical ? drag.bar.offsetHeight : drag.bar.offsetWidth;
        const perPixel = scrollPerDragPixel(measure, thumbLength);
        const pointer = isVertical ? event.clientY : event.clientX;
        const scroll = drag.fromScroll + (pointer - drag.fromPointer) * perPixel;

        if (isVertical) {
            script.scrollTop = scroll;
        } else {
            script.scrollLeft = scroll;
        }
    };

    private readonly endDrag = () => {
        this.drag?.bar.classList.remove('dragged');
        this.drag = undefined;
    };

    private barOf(axis: BarAxis) {
        return axis === 'vertical' ? this.verticalBar : this.horizontalBar;
    }

    private requireScript() {
        if (this.script === null) throw new Error('The script view is not attached.');
        return this.script;
    }
}
