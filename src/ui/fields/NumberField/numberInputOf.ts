import { AngleFieldType, NumberFieldType } from '../../../core/fields/index.ts';
import type { FieldModel, NumberInputDefinition } from '../../../editor/inspector/index.ts';

// What ValueInput reads from a number or angle field, stored or derived.
export function numberInputOf(field: FieldModel): NumberInputDefinition {
    if (field.kind === 'readOnlyRow') throw new Error('A read-only row has no box to type in.');

    const { definition } = field;
    const type = definition.type;
    const isNumber = type instanceof NumberFieldType || type instanceof AngleFieldType;
    if (!isNumber) throw new Error(`${definition.label} isn't a number field.`);

    if (field.kind === 'derived') {
        return { label: definition.label, type, unit: definition.unit };
    }

    return {
        label: definition.label,
        type,
        unit: field.definition.unit,
        displayScale: field.definition.displayScale,
        precision: field.definition.precision,
    };
}

// A number with both a minimum and a maximum shows a slider. Not one whose limits are refused, such as
// Skew: both ends of its track would be values it can't hold.
export function sliderRangeOf(definition: NumberInputDefinition) {
    const { type } = definition;
    if (type.kind === 'vector') return undefined;
    if (type.kind === 'angle' && type.refuseLimits) return undefined;
    if (type.min === undefined || type.max === undefined) return undefined;

    return { min: type.min, max: type.max };
}
