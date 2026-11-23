import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { Level } from '../../../../../core/level/index.ts';
import { labelName } from '../../../../../core/level/index.ts';
import { rowKind } from '../../../../../editor/entities-viewer/index.ts';
import type { EntityPickerRow } from '../../../../../editor/entities-viewer/index.ts';
import { Icon, RowKindIcon } from '../../../../shared/index.ts';
import './EntityPickerTreeRow.css';

export type EntityPickerTreeRowProps = {
    level: Level;
    row: EntityPickerRow;
    // From the top of the list, in pixels.
    top: number;
    // The entity picked now: marked as the Entities viewer marks a selected row.
    isChosen: boolean;
    // A parent shown around a search's match.
    isFaint: boolean;
    // Greyed: it can't be picked, and picking it says why in the message pill.
    isRefused: boolean;
    onPick: () => void;
    onToggleFold: () => void;
};

// The Entities viewer's space before the World's fold arrow.
const START_PADDING_PX = 2;

// A row as the Entities viewer draws it: the fold arrow, the kind icon and the name, indented by its depth.
export function EntityPickerTreeRow(props: EntityPickerTreeRowProps) {
    const { level, row, top, isChosen, isFaint, isRefused, onPick, onToggleFold } = props;
    const entity = level.requireEntity(row.entityId);
    const name = labelName(entity);
    const kind = rowKind(entity, level);

    const placement = {
        transform: `translateY(${top}px)`,
        paddingLeft: `calc(${START_PADDING_PX}px + ${row.depth} * var(--indent))`,
    };

    const toggleFold = (event: MouseEvent) => {
        event.stopPropagation();
        onToggleFold();
    };

    const expanded = row.hasChildren ? !row.isFolded : undefined;

    return (
        <div
            className="entity-picker-tree-row"
            role="treeitem"
            aria-level={row.depth + 1}
            aria-selected={isChosen}
            aria-expanded={expanded}
            aria-disabled={isRefused}
            data-faint={isFaint}
            style={placement}
            onClick={onPick}
        >
            <FoldArrow row={row} onToggle={toggleFold} />
            <RowKindIcon kind={kind} isSelected={isChosen} />
            <span className="name">{name}</span>
        </div>
    );
}

type FoldArrowProps = {
    row: EntityPickerRow;
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
