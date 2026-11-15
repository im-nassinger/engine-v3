import { MousePointer2 } from 'lucide-react';
import { IconButton } from '../../shared/index.ts';
import './Toolbar.css';

// Select is the only tool until stage 9 builds ToolController, so it is always the active one and
// clicking it changes nothing. Its key, 1, joins its tooltip when the key works.
export function Toolbar() {
    const keepSelect = () => {};

    return (
        <div className="toolbar" role="toolbar" aria-label="Tools" aria-orientation="vertical">
            <IconButton icon={MousePointer2} label="Select" isOn onClick={keepSelect} />
        </div>
    );
}
