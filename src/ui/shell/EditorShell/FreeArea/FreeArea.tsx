import { useLayoutEffect, useRef } from 'react';
import { useEditorSession } from '../../../EditorContext.tsx';
import './FreeArea.css';

function coveredEdgesAround(freeArea: HTMLElement) {
    const shell = freeArea.parentElement;
    if (!shell) return undefined;

    const shellBox = shell.getBoundingClientRect();
    const freeBox = freeArea.getBoundingClientRect();

    return {
        left: freeBox.left - shellBox.left,
        top: freeBox.top - shellBox.top,
        right: shellBox.right - freeBox.right,
        bottom: shellBox.bottom - freeBox.bottom,
    };
}

// The part of the level view no panel covers. It tells the view how far the panels reach, so fitting
// fills only what can be seen. Clicks pass through it to the canvas.
export function FreeArea() {
    const session = useEditorSession();
    const areaRef = useRef<HTMLDivElement>(null);

    // A layout effect, so the edges are known before the level view's canvas gets its first size.
    useLayoutEffect(() => {
        const area = areaRef.current;
        if (!area) return;

        const reportEdges = () => {
            const edges = coveredEdgesAround(area);
            if (edges === undefined) return;

            session.view.setCoveredEdges(edges);
        };

        reportEdges();
        const observer = new ResizeObserver(reportEdges);
        observer.observe(area);

        return () => observer.disconnect();
    }, [session]);

    return <div className="free-area" ref={areaRef} />;
}
