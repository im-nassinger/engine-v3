import { useRef } from 'react';
import { useVersion } from '../../hooks/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { KindsMenu } from './KindsMenu/index.ts';
import { ToolButton } from './ToolButton/index.ts';
import './ToolColumn.css';

// One button per tool ToolController holds, in its order: Select, Shape, Joint and the pen. Clicking a tool picks
// it; clicking the active one again locks it. The active tool's kinds, if it has any, stand open beside it.
export function ToolColumn() {
    // The active tool and the lock are read from the same controller object each time it moves, so the
    // React Compiler must not keep an old answer.
    'use no memo';

    const { controller } = useEditorTools();
    useVersion(controller.version);
    const activePlaceRef = useRef<HTMLSpanElement>(null);

    const active = controller.active;
    const isLocked = controller.isLocked;

    return (
        <div className="tool-column" role="toolbar" aria-label="Tools" aria-orientation="vertical">
            {controller.tools.map((tool) => (
                <ToolButton
                    key={tool.id}
                    toolId={tool.id}
                    isActive={tool === active}
                    isLocked={tool === active && isLocked}
                    placeRef={tool === active ? activePlaceRef : undefined}
                    onPick={() => controller.pick(tool.id)}
                />
            ))}
            <KindsMenu tool={active} toolPlace={activePlaceRef} />
        </div>
    );
}
