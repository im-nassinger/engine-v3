import type { CSSProperties, MouseEvent } from 'react';
import type { ColourStop } from '../../../../../core/fields/index.ts';
import { placeOnBar } from '../bar-places/placeOnBar.ts';
import './GradientBar.css';

export type GradientBarProps = {
    stops: readonly ColourStop[];
    canAdd: boolean;
    onAddAt: (place: number) => void;
};

const PERCENT = 100;

// The gradient from left to right, over a check pattern so see-through stops show. A click on it adds a stop
// there. It is left out of the Tab order, since a key press has no place on it: `+ Add stop` is the keyboard's.
export function GradientBar({ stops, canAdd, onAddAt }: GradientBarProps) {
    const colours = stops.map((stop) => `${stop.colour} ${stop.place * PERCENT}%`).join(', ');
    const barStyle = { '--gradient': `linear-gradient(90deg, ${colours})` } as CSSProperties;

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
        if (!canAdd) return;

        const barBox = event.currentTarget.getBoundingClientRect();
        const place = placeOnBar(event.clientX, barBox);
        onAddAt(place);
    };

    return (
        <button
            type="button"
            className="gradient-bar"
            style={barStyle}
            aria-label="Add a stop here"
            aria-disabled={!canAdd}
            tabIndex={-1}
            onClick={handleClick}
        />
    );
}
