import { ChoiceFieldType } from '../../../core/fields/index.ts';
import { MIXED, ValueInput } from '../../../editor/entity-inspector/index.ts';
import type { FieldModel } from '../../../editor/entity-inspector/index.ts';

const MIXED_TEXT = 'Mixed';

// A number rounded like a field shows it, with its unit; a choice by its option's label.
export function readOnlyText(field: FieldModel) {
    const { value, definition } = field;
    if (value === MIXED) return { text: MIXED_TEXT, unit: undefined, isMixed: true };

    if (typeof value === 'number') {
        const display = { displayScale: displayScaleOf(field), precision: precisionOf(field) };
        const text = ValueInput.format(value, display);

        return { text, unit: definition.unit, isMixed: false };
    }

    const choiceLabel = choiceLabelOf(field, value);
    const text = choiceLabel ?? String(value);

    return { text, unit: undefined, isMixed: false };
}

function displayScaleOf(field: FieldModel) {
    if (field.kind !== 'field') return undefined;

    return field.definition.displayScale;
}

function precisionOf(field: FieldModel) {
    if (field.kind !== 'field') return undefined;

    return field.definition.precision;
}

function choiceLabelOf(field: FieldModel, value: unknown) {
    const type = field.definition.type;
    if (!(type instanceof ChoiceFieldType)) return undefined;

    const options: readonly { value: unknown; label: string }[] = type.options;
    const option = options.find((candidate) => candidate.value === value);

    return option?.label;
}
