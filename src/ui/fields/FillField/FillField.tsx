import { ChoiceFieldType, isGradient, switchFillKind } from '../../../core/fields/index.ts';
import type { Fill, FillKind } from '../../../core/fields/index.ts';
import { MIXED } from '../../../editor/entity-inspector/index.ts';
import { ChoiceField } from '../ChoiceField/index.ts';
import { ColourBox } from '../ColourBox/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { GradientEditor } from './GradientEditor/index.ts';
import { innerFieldOf, innerPropsOf } from '../inner-fields/innerField.ts';
import './FillField.css';

const KIND_TYPE = new ChoiceFieldType<FillKind>([
    { value: 'none', label: 'None' },
    { value: 'solid', label: 'Solid' },
    { value: 'linear', label: 'Linear' },
    { value: 'radial', label: 'Radial' },
]);

// The Fill: a choice of None, Solid, Linear and Radial, then Solid's colour or the gradient editor. Picking a
// kind switches each selected entity from its own fill, as one step. Fills that differ show Mixed and no
// editor; equal ones show the editor, as equal values do.
export function FillField({ field, subject, onCommit, onCommitEach, slide }: FieldProps) {
    let fill: Fill | undefined;
    if (field.value !== MIXED) {
        fill = field.value as Fill;
    }

    const label = field.definition.label;
    const kindOptions = { key: 'kind', label, type: KIND_TYPE };
    const kindField = innerFieldOf(field, kindOptions, fill?.kind ?? MIXED);

    const chooseKind = (kind: unknown) => {
        onCommitEach((value) => switchFillKind(value as Fill, kind as FillKind));
    };

    const commitColour = (colour: string) => onCommit({ kind: 'solid', colour });
    const kindProps = innerPropsOf(subject, kindField, chooseKind);

    return (
        <div className="fill-field">
            <ChoiceField {...kindProps} />
            {fill?.kind === 'solid' && (
                <ColourBox
                    label={`${label} colour`}
                    colour={fill.colour}
                    noColour="Mixed"
                    isDisabled={!field.isEnabled}
                    onCommit={commitColour}
                />
            )}
            {fill && isGradient(fill) && (
                <GradientEditor field={field} subject={subject} fill={fill} onCommit={onCommit} slide={slide} />
            )}
        </div>
    );
}
