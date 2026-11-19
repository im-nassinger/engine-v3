import { AngleFieldType, NumberFieldType, VectorFieldType } from '../../../core/fields/index.ts';
import type { FieldModel, NumberInputDefinition } from '../../../editor/entity-inspector/index.ts';

// What ValueInput reads from a number, angle or vector field, stored or derived, or from Mass. A vector's boxes share it.
export function numberInputOf(field: FieldModel): NumberInputDefinition {
    const { definition } = field;
    const type = definition.type;
    const isNumber =
        type instanceof NumberFieldType || type instanceof AngleFieldType || type instanceof VectorFieldType;
    if (!isNumber) throw new Error(`${definition.label} isn't a number field.`);

    if (field.kind === 'derived' || field.kind === 'mass') {
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
