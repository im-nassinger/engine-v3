import type { CSSProperties } from 'react';
import type { ColourStop } from '../../../../../core/fields/index.ts';
import './GradientBar.css';

export type GradientBarProps = {
    stops: readonly ColourStop[];
};

const PERCENT = 100;

// The gradient from left to right, over a check pattern so see-through stops show.
export function GradientBar({ stops }: GradientBarProps) {
    const colours = stops.map((stop) => `${stop.colour} ${stop.place * PERCENT}%`).join(', ');
    const barStyle = { '--gradient': `linear-gradient(90deg, ${colours})` } as CSSProperties;

    return <div className="gradient-bar" style={barStyle} />;
}
