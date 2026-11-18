import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import type { EntityId } from '../../../../core/level/index.ts';
import type { AddableComponent } from '../../../../editor/entity-inspector/index.ts';
import type { OpenLevel } from '../../../../editor/session/index.ts';
import { Icon } from '../../../shared/index.ts';
import { AddComponentMenu } from './AddComponentMenu/index.ts';
import './AddComponent.css';

export type AddComponentProps = {
    openLevel: OpenLevel;
    entries: readonly AddableComponent[];
    entityIds: readonly EntityId[];
};

// The button under the last card, across the panel. It opens a searchable menu of the components some
// shown entity lacks.
export function AddComponent({ openLevel, entries, entityIds }: AddComponentProps) {
    const [isOpen, setIsOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);

    const toggle = () => setIsOpen((wasOpen) => !wasOpen);
    const close = () => setIsOpen(false);

    return (
        <div className="add-component" ref={anchorRef}>
            <button type="button" className="open" aria-expanded={isOpen} onClick={toggle}>
                <Icon icon={Plus} size="small" />
                Add Component
            </button>
            {isOpen && (
                <AddComponentMenu
                    openLevel={openLevel}
                    entries={entries}
                    entityIds={entityIds}
                    anchor={anchorRef}
                    onClose={close}
                />
            )}
        </div>
    );
}
