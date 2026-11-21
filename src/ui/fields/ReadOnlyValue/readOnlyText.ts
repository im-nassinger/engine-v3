import { ChoiceFieldType } from '../../../core/fields/index.ts';
import { MIXED, ValueInput } from '../../../editor/entity-inspector/index.ts';
import type { FieldModel } from '../../../editor/entity-inspector/index.ts';

const MIXED_TEXT = 'Mixed';

// A number rounded like a field shows it, with its unit; a choice by its option's label; a list, such as a
// Rope's Points, by how many items it holds.
export function readOnlyText(field: FieldModel) {
    const { value, definition } = field;
    if (value === MIXED) return { text: MIXED_TEXT, unit: undefined, isMixed: true };

    if (typeof value === 'number') {
        const display = { displayScale: displayScaleOf(field), precision: precisionOf(field) };
        const text = ValueInput.format(value, display);

        return { text, unit: definition.unit, isMixed: false };
    }

    if (Array.isArray(value)) return { text: String(value.length), unit: undefined, isMixed: false };

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
