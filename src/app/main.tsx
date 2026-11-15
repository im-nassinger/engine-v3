import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/theme.css';
import { EditorContext } from '../ui/EditorContext.tsx';
import { LevelViewMountContext } from '../ui/level-view-host/index.ts';
import { EditorShell } from '../ui/shell/index.ts';
import { EditorComposition } from './EditorComposition.ts';

function requireElement(id: string) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`The page has no #${id} element.`);

    return element;
}

// The editor first draws in its own font, so no text jumps when the font arrives. Nothing on the page
// uses the font yet, so document.fonts.ready alone wouldn't wait for it.
const FONT_WEIGHTS = ['400', '500', '600'];
const fontLoads = FONT_WEIGHTS.map((weight) => document.fonts.load(`${weight} 12px "JetBrains Mono"`));
await Promise.all(fontLoads);

const composition = await EditorComposition.create();
const root = createRoot(requireElement('root'));

root.render(
    <StrictMode>
        <EditorContext value={composition.session}>
            <LevelViewMountContext value={composition.levelView}>
                <EditorShell />
            </LevelViewMountContext>
        </EditorContext>
    </StrictMode>,
);
