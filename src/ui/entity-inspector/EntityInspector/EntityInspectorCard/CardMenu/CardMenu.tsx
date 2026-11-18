import { Ellipsis } from 'lucide-react';
import type { EntityId } from '../../../../../core/level/index.ts';
import { removeComponent, resetComponent } from '../../../../../editor/commands/index.ts';
import type { EditOutcome } from '../../../../../editor/history/index.ts';
import type { Availability, CardModel } from '../../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { Icon, Menu, MenuButton, useOpenMenu } from '../../../../shared/index.ts';
import type { MenuEntry } from '../../../../shared/index.ts';

export type CardMenuProps = {
    openLevel: OpenLevel;
    card: CardModel;
    entityIds: readonly EntityId[];
};

// The `…` button at the right of a card's title, with Remove and Reset to defaults. A disabled entry
// says why in its tooltip.
export function CardMenu({ openLevel, card, entityIds }: CardMenuProps) {
    const label = `${card.title} menu`;
    const menu = <CardMenuEntries openLevel={openLevel} card={card} entityIds={entityIds} />;

    return (
        <MenuButton label={label} menu={menu} look="quiet">
            <Icon icon={Ellipsis} />
        </MenuButton>
    );
}

function CardMenuEntries({ openLevel, card, entityIds }: CardMenuProps) {
    const session = useEditorSession();
    const { close, anchor } = useOpenMenu();
    const { typeName } = card;

    const showRefusal = (outcome: EditOutcome) => {
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    const remove = () => {
        const outcome = removeComponent(openLevel, entityIds, typeName);
        showRefusal(outcome);
    };

    const reset = () => {
        const outcome = resetComponent(openLevel, entityIds, typeName);
        showRefusal(outcome);
    };

    const removeRefusal = reasonOf(card.canRemove);
    const resetRefusal = reasonOf(card.canReset);
    const entries: MenuEntry[] = [
        { kind: 'action', id: 'remove', label: 'Remove', onChoose: remove, disabledReason: removeRefusal },
        { kind: 'action', id: 'reset', label: 'Reset to defaults', onChoose: reset, disabledReason: resetRefusal },
    ];

    return <Menu entries={entries} onClose={close} anchor={anchor} align="end" />;
}

function reasonOf(availability: Availability) {
    if (availability.enabled) return undefined;

    return availability.reason;
}
