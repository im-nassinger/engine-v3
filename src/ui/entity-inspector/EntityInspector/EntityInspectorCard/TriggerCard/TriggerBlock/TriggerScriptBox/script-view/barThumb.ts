// The smallest a scrollbar's thumb gets, so it can still be grabbed.
const MIN_THUMB_PX = 24;

export type BarMeasure = {
    view: number;
    content: number;
    scroll: number;
    track: number;
};

export type BarThumb = {
    offset: number;
    length: number;
};

// A thumb is as long, against its track, as the view against the content, and as far along the track as the
// scroll along what can be scrolled.
export function barThumb({ view, content, scroll, track }: BarMeasure): BarThumb {
    const length = Math.min(track, Math.max(MIN_THUMB_PX, (track * view) / content));
    const scrollable = content - view;
    const along = scrollable <= 0 ? 0 : scroll / scrollable;
    const offset = (track - length) * along;

    return { offset, length };
}

// How far the script scrolls for each pixel a thumb is dragged: the room left to scroll over the room left
// for the thumb to move.
export function scrollPerDragPixel({ view, content, track }: BarMeasure, thumbLength: number) {
    const thumbRoom = Math.max(1, track - thumbLength);
    return (content - view) / thumbRoom;
}
