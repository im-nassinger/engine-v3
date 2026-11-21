import { useEffect, useRef } from 'react';
import type { Fill } from '../../../core/fields/index.ts';
import { MIXED } from '../../../editor/entity-inspector/index.ts';
import { ColourBox } from '../ColourBox/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import './FillField.css';

const WHITE = '#FFFFFFFF';

// v1's fill: a colour that can be emptied. The None switch beside it empties the fill, and switching it
// off brings back the last colour shown, or the field's default. Typing or picking a colour fills it.
export function FillField({ field, onCommit }: FieldProps) {
    const lastColour = useRef(defaultColourOf(field));
    const fill = field.value === MIXED ? undefined : (field.value as Fill);

    let colour: string | undefined;
    if (fill?.kind === 'solid') {
        colour = fill.colour;
    }

    useEffect(() => {
        if (colour === undefined) return;

        lastColour.current = colour;
    }, [colour]);

    const isNone = fill?.kind === 'none';
    const noColour = isNone ? 'None' : 'Mixed';
    const isDisabled = !field.isEnabled;

    const commitColour = (newColour: string) => onCommit({ kind: 'solid', colour: newColour });

    const toggleNone = () => {
        if (isNone) {
            commitColour(lastColour.current);
            return;
        }

        onCommit({ kind: 'none' });
    };

    return (
        <div className="fill-field">
            <ColourBox
                label={field.definition.label}
                colour={colour}
                noColour={noColour}
                isDisabled={isDisabled}
                onCommit={commitColour}
            />
            <button
                type="button"
                className="none"
                aria-label={`${field.definition.label} none`}
                aria-pressed={isNone}
                disabled={isDisabled}
                onClick={toggleNone}
            >
                None
            </button>
        </div>
    );
}

function defaultColourOf(field: FieldProps['field']) {
    if (field.kind !== 'field') return WHITE;

    const fill = field.definition.defaultValue as Fill;
    if (fill.kind === 'solid') return fill.colour;

    return WHITE;
}
