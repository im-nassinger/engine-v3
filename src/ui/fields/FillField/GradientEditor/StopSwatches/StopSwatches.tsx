import type { CSSProperties } from 'react';
import type { ColourStop } from '../../../../../core/fields/index.ts';
import './StopSwatches.css';

export type StopSwatchesProps = {
    stops: readonly ColourStop[];
    chosenIndex: number;
    isDisabled: boolean;
    onChoose: (index: number) => void;
};

const PERCENT = 100;

// One swatch under the bar for each stop, at its place; clicking one chooses it for the fields below.
export function StopSwatches({ stops, chosenIndex, isDisabled, onChoose }: StopSwatchesProps) {
    return (
        <div className="stop-swatches">
            {stops.map((stop, index) => {
                const swatchStyle = { left: `${stop.place * PERCENT}%`, '--swatch': stop.colour } as CSSProperties;

                return (
                    <button
                        key={index}
                        type="button"
                        className="stop"
                        style={swatchStyle}
                        aria-label={`Stop ${index + 1}`}
                        aria-pressed={index === chosenIndex}
                        disabled={isDisabled}
                        onClick={() => onChoose(index)}
                    />
                );
            })}
        </div>
    );
}
