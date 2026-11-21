import type { CSSProperties, PointerEvent } from 'react';
import type { ColourStop } from '../../../../../core/fields/index.ts';
import './StopSwatches.css';

export type StopSwatchesProps = {
    stops: readonly ColourStop[];
    chosenIndex: number;
    isDisabled: boolean;
    onPress: (event: PointerEvent<HTMLElement>, index: number) => void;
    onClick: (index: number) => void;
};

const PERCENT = 100;

// One swatch under the bar for each stop, at its place; pressing one chooses it for the fields below, and
// dragging it moves it along the bar.
export function StopSwatches({ stops, chosenIndex, isDisabled, onPress, onClick }: StopSwatchesProps) {
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
                        onPointerDown={(event) => onPress(event, index)}
                        onClick={() => onClick(index)}
                    />
                );
            })}
        </div>
    );
}
