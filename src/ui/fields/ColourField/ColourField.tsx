import { ColourBox } from '../ColourBox/index.ts';
import type { FieldProps } from '../FieldProps.ts';

// A colour, such as the outline's: the swatch and its code. Mixed shows an empty swatch.
export function ColourField({ field, onCommit }: FieldProps) {
    let colour: string | undefined;
    if (typeof field.value === 'string') {
        colour = field.value;
    }

    return (
        <ColourBox
            label={field.definition.label}
            colour={colour}
            noColour="Mixed"
            isDisabled={!field.isEnabled}
            onCommit={onCommit}
        />
    );
}
