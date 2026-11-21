import { useRef } from 'react';
import type { RefObject } from 'react';
import { JointTool, PencilTool, ShapeTool } from '../../../../editor/tools/index.ts';
import type { Tool } from '../../../../editor/tools/index.ts';
import { usePopupPlacement } from '../../../shared/index.ts';
import type { PopupPlacement } from '../../../shared/index.ts';
import { JointKinds } from './JointKinds/index.ts';
import { PencilOptions } from './PencilOptions/index.ts';
import { ShapeKinds } from './ShapeKinds/index.ts';
import './KindsMenu.css';

const PLACEMENT: PopupPlacement = { side: 'beside', align: 'centre', gapPx: 12 };

export type KindsMenuProps = {
    tool: Tool;
    // The active tool's place in the column, whose parent is the column itself.
    toolPlace: RefObject<HTMLElement | null>;
};

// Stands open beside the active tool for as long as it is active: the Shape tool's kinds, the Joint tool's
// types or the Pencil's smoothness. Other tools have none. It is centred on the tool and measured from the column's edge, not the button's.
export function KindsMenu({ tool, toolPlace }: KindsMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    const readAnchor = () => {
        const place = toolPlace.current;
        const column = place?.parentElement;
        if (!place || !column) return undefined;

        const placeBox = place.getBoundingClientRect();
        const columnBox = column.getBoundingClientRect();

        return { left: columnBox.left, right: columnBox.right, top: placeBox.top, bottom: placeBox.bottom };
    };
    usePopupPlacement(menuRef, readAnchor, PLACEMENT);

    const isShape = tool instanceof ShapeTool;
    const isJoint = tool instanceof JointTool;
    const isPencil = tool instanceof PencilTool;
    if (!isShape && !isJoint && !isPencil) return null;

    return (
        <div className="kinds-menu" ref={menuRef} role="group" aria-label="Kinds menu">
            {isShape && <ShapeKinds tool={tool} />}
            {isJoint && <JointKinds tool={tool} />}
            {isPencil && <PencilOptions tool={tool} />}
        </div>
    );
}
