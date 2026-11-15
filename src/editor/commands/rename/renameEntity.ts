import { NameComponent } from '../../../core/components/index.ts';
import { TextFieldType } from '../../../core/fields/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { SetValueChange } from '../../history/index.ts';
import type { EditOutcome } from '../../history/index.ts';
import type { OpenLevel } from '../../session/index.ts';

// The Entities panel's renaming in place. The name is trimmed; an empty one keeps the old name and makes
// no step, and one past the name field's limit is refused rather than cut.
export function renameEntity(openLevel: OpenLevel, entityId: EntityId, text: string): EditOutcome {
    const { level, editor } = openLevel;
    const entity = level.requireEntity(entityId);
    if (entity === level.world) return { kind: 'refused', reason: "The World can't be renamed" };

    const newName = text.trim();
    if (newName.length === 0) return { kind: 'done' };

    const maxLength = nameMaxLength();
    const characterCount = Array.from(newName).length;
    if (characterCount > maxLength) {
        return { kind: 'refused', reason: `A name can be at most ${maxLength} characters` };
    }

    const nameComponent = entity.requireComponent(NameComponent);
    const oldName = nameComponent.get('name');
    if (newName === oldName) return { kind: 'done' };

    const change = new SetValueChange({
        entityId,
        schema: NameComponent.schema,
        key: 'name',
        oldValue: oldName,
        newValue: newName,
    });

    return editor.edit(`Rename ${oldName}`, (transaction) => {
        transaction.apply(change);
        return { kind: 'done' };
    });
}

function nameMaxLength() {
    const entry = NameComponent.schema.findEntry('name');
    const fieldType = entry?.type;
    const isTextField = fieldType instanceof TextFieldType;

    if (!isTextField || fieldType.maxLength === undefined) {
        throw new Error('The name field has no length limit.');
    }

    return fieldType.maxLength;
}
