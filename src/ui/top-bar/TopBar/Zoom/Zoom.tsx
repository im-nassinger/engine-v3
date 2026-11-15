import { zoomPercentText } from '../../../../editor/view/index.ts';
import { CommandMenu, zoomMenuEntries } from '../../../commands/index.ts';
import { useEditorSession } from '../../../EditorContext.tsx';
import { useReading } from '../../../hooks/index.ts';
import { MenuButton } from '../../../shared/index.ts';
import { ZoomBox } from './ZoomBox/index.ts';
import './Zoom.css';

// The view's zoom as a whole percentage. Its menu has a box for a typed value and the zoom commands.
export function Zoom() {
    const session = useEditorSession();
    const view = session.view;
    const percentText = useReading(view.version, () => zoomPercentText(view.zoom));

    const box = <ZoomBox />;
    const menu = <CommandMenu entriesOf={zoomMenuEntries} align="end" header={box} />;

    return (
        <MenuButton label="Zoom" menu={menu} hasArrow>
            <span className="zoom">{percentText}</span>
        </MenuButton>
    );
}
