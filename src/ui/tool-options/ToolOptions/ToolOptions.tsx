import { ShapeTool } from '../../../editor/tools/index.ts';
import { useVersion } from '../../hooks/index.ts';
import { useEditorTools } from '../../tools/index.ts';
import { ShapeOptions } from './ShapeOptions/index.ts';
import './ToolOptions.css';

// The options strip over the level view's top left, for the active tool that has options: the Shape
// tool's kinds in v1, the Joint tool's types with its stage.
export function ToolOptions() {
    // The active tool is read from the same controller object each time it moves, so the React
    // Compiler must not keep an old answer.
    'use no memo';

    const { controller } = useEditorTools();
    useVersion(controller.version);

    const active = controller.active;
    if (!(active instanceof ShapeTool)) return null;

    return (
        <div className="tool-options" role="toolbar" aria-label="Tool options">
            <ShapeOptions tool={active} />
        </div>
    );
}
