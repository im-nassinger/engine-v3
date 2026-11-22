import { ListFieldType } from '../../../core/fields/index.ts';
import type { FieldModel } from '../../../editor/entity-inspector/index.ts';

// A list whose rows are each labelled by their item's name, such as the World's variables: its card draws
// the rows across the whole card, without the field's own label.
export function drawsOwnLabels(field: FieldModel) {
    const type = field.definition.type;
    if (!(type instanceof ListFieldType)) return false;

    return type.itemType.kind === 'variable';
}
