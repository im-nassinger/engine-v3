// Which of a card's triggers are near enough to the scrolled view to draw: on screen, or within about a
// screen above or below it. The rest are drawn as placeholders of the same height, so an entity with
// hundreds of triggers shows at once and scrolls without drawing them all (standing yes, 2026-11-27).
//
// One IntersectionObserver watches the list's items, each marked with `data-trigger-id` and `data-drawn`,
// against the panel that scrolls them. An item stays the same element while its trigger swaps between its
// block and its placeholder, so the observer keeps watching it. A trigger it has not reported on yet is near when it is among the first few, or when it
// came after the first report, such as a trigger just added, so a new trigger never shows as a placeholder.
const NEAR_MARGIN = '800px 0px';
const FIRST_NEAR_COUNT = 8;

export class NearView {
    private observer: IntersectionObserver | undefined = undefined;
    private readonly nearIds = new Set<number>();
    private readonly farIds = new Set<number>();
    // The last height each trigger was drawn at, which its placeholder keeps.
    private readonly heights = new Map<number, number>();
    private hasReported = false;
    private readonly onChange: () => void;

    constructor(onChange: () => void) {
        this.onChange = onChange;
    }

    watch(list: HTMLElement | null) {
        this.dispose();
        if (list === null) return;

        const root = scrollingAncestorOf(list);
        this.observer = new IntersectionObserver(this.report, { root, rootMargin: NEAR_MARGIN });
        for (const item of list.querySelectorAll('[data-trigger-id]')) {
            this.observer.observe(item);
        }
    }

    dispose() {
        this.observer?.disconnect();
        this.observer = undefined;
    }

    isNear(id: number, index: number) {
        if (this.nearIds.has(id)) return true;
        if (this.farIds.has(id)) return false;
        if (this.hasReported) return true;

        return index < FIRST_NEAR_COUNT;
    }

    heightOf(id: number) {
        return this.heights.get(id);
    }

    private readonly report = (entries: IntersectionObserverEntry[]) => {
        let changed = false;
        for (const entry of entries) {
            const item = entry.target;
            if (!(item instanceof HTMLElement)) continue;

            const id = Number(item.dataset['triggerId']);
            const wasNear = this.nearIds.has(id);
            const wasFar = this.farIds.has(id);
            const isDrawn = item.dataset['drawn'] === 'true';
            if (isDrawn) {
                this.heights.set(id, entry.boundingClientRect.height);
            }

            if (entry.isIntersecting) {
                this.nearIds.add(id);
                this.farIds.delete(id);
                changed ||= !wasNear;
            } else {
                this.farIds.add(id);
                this.nearIds.delete(id);
                changed ||= !wasFar;
            }
        }
        this.hasReported = true;

        if (!changed) return;

        this.onChange();
    };
}

// The nearest ancestor that scrolls, the Entity inspector's cards; null for the page itself.
function scrollingAncestorOf(element: HTMLElement) {
    let ancestor = element.parentElement;
    while (ancestor !== null) {
        const overflowY = getComputedStyle(ancestor).overflowY;
        const scrolls = overflowY === 'auto' || overflowY === 'scroll';
        if (scrolls) return ancestor;

        ancestor = ancestor.parentElement;
    }

    return null;
}
