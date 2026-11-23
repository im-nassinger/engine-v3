import type { EntityId, Level } from '../../../../core/level/index.ts';
import { EntityChoices } from '../../../../editor/entity-inspector/index.ts';
import { EntityPicker } from '../../../entity-picker/index.ts';
import { useOpenMenu } from '../../../shared/index.ts';
import type { MenuEntry } from '../../../shared/index.ts';

export type EntityFieldMenuProps = {
    level: Level;
    // The field's own entities, which it can't point at.
    ownIds: readonly EntityId[];
    chosenValue: unknown;
    onChoose: (value: EntityId | null) => void;
};

// None, then the entity picker's tree, where the World, the camera and the field's own entities are
// greyed. Typing searches the names, and Enter picks the first one.
export function EntityFieldMenu({ level, ownIds, chosenValue, onChoose }: EntityFieldMenuProps) {
    const { close, anchor } = useOpenMenu();

    const noneEntry: MenuEntry = {
        kind: 'action',
        id: 'none',
        label: 'None',
        checked: chosenValue === null,
        onChoose: () => onChoose(null),
    };

    const chosenId = typeof chosenValue === 'number' ? chosenValue : undefined;
    const refusalOf = (entityId: EntityId) => EntityChoices.refusal(level, ownIds, entityId);

    return (
        <EntityPicker
            level={level}
            anchor={anchor}
            entries={[noneEntry]}
            chosenId={chosenId}
            refusalOf={refusalOf}
            onPick={onChoose}
            onClose={close}
        />
    );
}
