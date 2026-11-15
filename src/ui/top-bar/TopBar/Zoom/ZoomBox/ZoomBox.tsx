import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { zoomFromPercentText, zoomPercentText } from '../../../../../editor/view/index.ts';
import { useEditorSession } from '../../../../EditorContext.tsx';
import { useOpenMenu } from '../../../../shared/index.ts';
import './ZoomBox.css';

const NOT_A_ZOOM = 'Type a zoom such as 150%';

// Enter zooms to the typed percentage about the view's middle, clamped to 1% to 1000%, and closes the
// menu. Zooming is never a step, so it changes the view directly instead of through a command.
export function ZoomBox() {
    const session = useEditorSession();
    const { close } = useOpenMenu();
    const startingText = zoomPercentText(session.view.zoom);
    const [text, setText] = useState(startingText);

    const zoomToTyped = () => {
        const zoom = zoomFromPercentText(text);

        if (zoom === undefined) {
            session.status.show(NOT_A_ZOOM);
            return;
        }

        session.view.zoomAboutMiddle(zoom);
        close();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;

        event.preventDefault();
        zoomToTyped();
    };

    return (
        <input
            className="zoom-box"
            aria-label="Zoom percentage"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(event) => event.target.select()}
            autoFocus
        />
    );
}
