import type { FieldModel } from '../../../editor/entity-inspector/index.ts';
import { readOnlyText } from './readOnlyText.ts';
import './ReadOnlyValue.css';

export type ReadOnlyValueProps = {
    field: FieldModel;
};

// A value shown without a box, such as the Mass row or the World's Kind.
export function ReadOnlyValue({ field }: ReadOnlyValueProps) {
    const { text, unit, isMixed } = readOnlyText(field);

    return (
        <span className="read-only-value" data-mixed={isMixed}>
            {text}
            {unit !== undefined && <span className="unit">{unit}</span>}
        </span>
    );
}
