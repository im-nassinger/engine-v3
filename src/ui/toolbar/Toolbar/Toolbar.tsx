import { useVersion } from '../../hooks/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { ToolButton } from './ToolButton/index.ts';
import './Toolbar.css';

// One button per tool ToolController holds, in its order: Select and Shape in v1 until the Joint tool
// comes with its stage. Clicking a tool picks it; clicking the active one again locks it.
export function Toolbar() {
    // The active tool and the lock are read from the same controller object each time it moves, so the
    // React Compiler must not keep an old answer.
    'use no memo';

    const { controller } = useEditorTools();
    useVersion(controller.version);

    const activeId = controller.active.id;
    const isLocked = controller.isLocked;

    return (
        <div className="toolbar" role="toolbar" aria-label="Tools" aria-orientation="vertical">
            {controller.tools.map((tool) => (
                <ToolButton
                    key={tool.id}
                    toolId={tool.id}
                    isActive={tool.id === activeId}
                    isLocked={tool.id === activeId && isLocked}
                    onPick={() => controller.pick(tool.id)}
                />
            ))}
        </div>
    );
}
