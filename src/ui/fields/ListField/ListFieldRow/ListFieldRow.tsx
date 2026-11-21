import { X } from 'lucide-react';
import type { FieldType } from '../../../../core/fields/index.ts';
import type { Point } from '../../../../core/geometry/index.ts';
import type { Axis } from '../../../../editor/commands/index.ts';
import { ListItems } from '../../../../editor/entity-inspector/index.ts';
import type { FieldModel } from '../../../../editor/entity-inspector/index.ts';
import { IconButton } from '../../../shared/index.ts';
import { ITEM_FIELD_COMPONENTS } from '../../fieldComponents.ts';
import type { FieldProps, FieldSubject } from '../../FieldProps.ts';
import './ListFieldRow.css';

export type ListFieldRowProps = {
    field: FieldModel;
    subject: FieldSubject;
    items: readonly unknown[];
    itemType: FieldType<unknown>;
    index: number;
    onCommit: (value: unknown) => void;
};

// One item: its number, the field of its type, and its remove button. A change to it commits the whole
// list with only this item changed.
export function ListFieldRow({ field, subject, items, itemType, index, onCommit }: ListFieldRowProps) {
    const Item = ITEM_FIELD_COMPONENTS[itemType.kind];
    const item = items[index];
    const itemField = itemFieldOf(field, itemType, index, item);
    const label = itemField.definition.label;

    const commitItem = (value: unknown) => onCommit(ListItems.withItem(items, index, value, itemType));

    const commitItemAxis = (axis: Axis, value: number) => {
        const vector = item as Point;
        const newVector = { ...vector, [axis]: value };
        commitItem(newVector);
    };

    const commitItemEach = (valueFor: (value: unknown) => unknown) => commitItem(valueFor(item));

    const remove = () => onCommit(ListItems.without(items, index, itemType));

    const itemProps: FieldProps = {
        field: itemField,
        subject,
        onCommit: commitItem,
        onCommitAxis: commitItemAxis,
        onCommitEach: commitItemEach,
    };

    return (
        <div className="list-field-row" data-index={index}>
            <span className="number">{index + 1}</span>
            <span className="item">{Item && <Item {...itemProps} />}</span>
            <IconButton icon={X} label={`Remove ${label}`} onClick={remove} />
        </div>
    );
}

// The item as a field of its own, named after the list and its number, such as "Points 2".
function itemFieldOf(field: FieldModel, itemType: FieldType<unknown>, index: number, item: unknown): FieldModel {
    if (field.kind === 'mass') throw new Error('Mass has no items.');

    const label = `${field.definition.label} ${index + 1}`;
    const key = `${field.definition.key}.${index}`;

    if (field.kind === 'derived') {
        const definition = { ...field.definition, key, label, type: itemType };

        return { kind: 'derived', definition, value: item, isEnabled: true, isReadOnly: false };
    }

    const definition = { ...field.definition, key, label, type: itemType };

    return { kind: 'field', definition, value: item, isEnabled: field.isEnabled, isReadOnly: false };
}
