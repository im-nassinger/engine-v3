import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { MouseEvent, PointerEvent } from 'react';
import type { EntitiesRow } from '../../../../../editor/entities-viewer/index.ts';
import { rowKind } from '../../../../../editor/entities-viewer/index.ts';
import type { RowClickKind } from '../../../../../editor/entities-viewer/index.ts';
import { toggleEntityHidden } from '../../../../../editor/commands/index.ts';
import type { OpenLevel } from '../../../../../editor/session/index.ts';
import type { KeyboardPlatform } from '../../../../../editor/shortcuts/index.ts';
import { labelName } from '../../../../../core/level/index.ts';
import { useCommands } from '../../../../commands/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { useEntityVersion, useReading } from '../../../../hooks/index.ts';
import { Icon, RowKindIcon } from '../../../../shared/index.ts';
import { indentAt } from '../rowLayout.ts';
import { RowNameBox } from './RowNameBox/index.ts';
import './EntitiesListRow.css';

export type EntitiesListRowProps = {
    openLevel: OpenLevel;
    row: EntitiesRow;
    // From the top of the list, in pixels.
    top: number;
    // True while the row's name box is open.
    isRenaming: boolean;
    onRenameStart: () => void;
    onRenameEnd: () => void;
    // A press that may become a drag of the row. Presses on the arrow, the eye and the name box don't.
    onDragPress: (event: PointerEvent) => void;
};

// One entity's row: the fold arrow, the kind icon, the name and the eye. It redraws when its own
// entity changes or its selected state does, never when another entity is renamed.
export function EntitiesListRow({
    openLevel,
    row,
    top,
    isRenaming,
    onRenameStart,
    onRenameEnd,
    onDragPress,
}: EntitiesListRowProps) {
    // The name and the eye are read from the same entity object after it changed, so the React
    // Compiler must not keep their old values.
    'use no memo';

    const session = useEditorSession();
    const { platform } = useCommands();
    const { level, selection, rowClicks } = openLevel;
    const entityId = row.entityId;
    useEntityVersion(level, entityId);
    const isSelected = useReading(selection.version, () => selection.has(entityId));

    const entity = level.requireEntity(entityId);
    const name = labelName(entity);
    const kind = rowKind(entity, level);
    const isWorld = entity === level.world;

    const placement = {
        transform: `translateY(${top}px)`,
        paddingLeft: `${indentAt(row.depth)}px`,
    };

    const handleClick = (event: MouseEvent) => {
        const clickKind = rowClickKind(event, platform);
        rowClicks.click(entityId, clickKind);
    };

    const handlePointerDown = (event: PointerEvent) => {
        const pressedElement = event.target;
        const onControl = pressedElement instanceof Element && pressedElement.closest('button, input') !== null;
        if (onControl) return;

        onDragPress(event);
    };

    const toggleFold = (event: MouseEvent) => {
        event.stopPropagation();
        openLevel.entitiesRows.setFolded(entityId, !row.isFolded);
    };

    const toggleHidden = (event: MouseEvent) => {
        event.stopPropagation();
        const outcome = toggleEntityHidden(openLevel, entityId);
        if (outcome.kind !== 'refused') return;

        session.status.show(outcome.reason);
    };

    const startRenaming = () => {
        if (isWorld) {
            session.status.show("The World can't be renamed");
            return;
        }

        onRenameStart();
    };

    const expanded = row.hasChildren ? !row.isFolded : undefined;

    return (
        <div
            className="entities-list-row"
            role="treeitem"
            aria-level={row.depth + 1}
            aria-selected={isSelected}
            aria-expanded={expanded}
            data-hidden-by-parent={row.hiddenByParent}
            style={placement}
            onClick={handleClick}
            onPointerDown={handlePointerDown}
        >
            <FoldArrow row={row} onToggle={toggleFold} />
            <RowKindIcon kind={kind} isSelected={isSelected} />
            {isRenaming ? (
                <RowNameBox openLevel={openLevel} entityId={entityId} name={name} onClose={onRenameEnd} />
            ) : (
                <span className="name" onDoubleClick={startRenaming}>
                    {name}
                </span>
            )}
            {!isWorld && <EyeButton name={name} isHidden={entity.isHidden} onToggle={toggleHidden} />}
        </div>
    );
}

type FoldArrowProps = {
    row: EntitiesRow;
    onToggle: (event: MouseEvent) => void;
};

// A row with no children has no arrow, only its space, so the kind icons line up.
function FoldArrow({ row, onToggle }: FoldArrowProps) {
    if (!row.hasChildren) return <span className="fold" />;

    const icon = row.isFolded ? ChevronRight : ChevronDown;
    const label = row.isFolded ? 'Unfold' : 'Fold';

    return (
        <button type="button" className="fold" aria-label={label} onClick={onToggle}>
            <Icon icon={icon} size="small" />
        </button>
    );
}

type EyeButtonProps = {
    name: string;
    isHidden: boolean;
    onToggle: (event: MouseEvent) => void;
};

function EyeButton({ name, isHidden, onToggle }: EyeButtonProps) {
    const icon = isHidden ? EyeOff : Eye;
    const verb = isHidden ? 'Show' : 'Hide';
    const label = `${verb} ${name}`;

    return (
        <button type="button" className="eye" aria-label={label} aria-pressed={isHidden} onClick={onToggle}>
            <Icon icon={icon} />
        </button>
    );
}

// Cmd plays Ctrl's part on a Mac, as in the keys.
function rowClickKind(event: MouseEvent, platform: KeyboardPlatform): RowClickKind {
    if (event.shiftKey) return 'shiftClick';

    const addsToSelection = platform === 'mac' ? event.metaKey : event.ctrlKey;
    if (addsToSelection) return 'ctrlClick';

    return 'click';
}
