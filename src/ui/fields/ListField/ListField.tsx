import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { ListFieldType } from '../../../core/fields/index.ts';
import { ListItems, MIXED } from '../../../editor/inspector/index.ts';
import { useEditorSession } from '../../EditorContext.tsx';
import { useReading } from '../../hooks/index.ts';
import { Icon, IconButton } from '../../shared/index.ts';
import type { FieldProps } from '../FieldProps.ts';
import { ListFieldRow } from './ListFieldRow/index.ts';
import './ListField.css';

// Folded, its item count; unfolded, a row per item, each the field of the item type with its remove
// button, and a + that adds a copy of the last item. Every change is one step; one past the list's
// limits is refused with a status text. A list the selected entities don't share reads Mixed.
export function ListField({ field, subject, onCommit }: FieldProps) {
    const { listFolds } = useEditorSession();
    const { typeName } = subject;
    const key = field.definition.key;
    const isFolded = useReading(listFolds.version, () => listFolds.isFolded(typeName, key));

    if (field.value === MIXED) {
        return (
            <span className="list-field" data-mixed="true">
                Mixed
            </span>
        );
    }

    const itemType = itemTypeOf(field);
    const items = field.value as readonly unknown[];

    const toggleFold = () => listFolds.setFolded(typeName, key, !isFolded);
    const addItem = () => onCommit(ListItems.withCopyOfLast(items, itemType));

    const foldIcon = isFolded ? ChevronRight : ChevronDown;
    const countText = items.length === 1 ? '1 item' : `${items.length} items`;
    const rowProps = { field, subject, items, itemType, onCommit };

    return (
        <div className="list-field" data-mixed="false">
            <button type="button" className="fold" aria-expanded={!isFolded} onClick={toggleFold}>
                <Icon icon={foldIcon} size="small" />
                <span className="count">{countText}</span>
            </button>
            {!isFolded && (
                <div className="items">
                    {items.map((_item, index) => (
                        <ListFieldRow key={index} {...rowProps} index={index} />
                    ))}
                    <IconButton icon={Plus} label={`Add to ${field.definition.label}`} onClick={addItem} />
                </div>
            )}
        </div>
    );
}

function itemTypeOf(field: FieldProps['field']) {
    if (field.kind === 'readOnlyRow') throw new Error('A read-only row has no items.');

    const type = field.definition.type;
    if (!(type instanceof ListFieldType)) throw new Error(`${field.definition.label} isn't a list field.`);

    return type.itemType;
}
