import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../ui/theme.css';
import { startLevelView } from './startLevelView.ts';
import { buildTestLevel } from './testLevel.ts';

const PROJECT_NAME = 'engine-v3';

function requireElement(id: string) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`The page has no #${id} element.`);

    return element;
}

const root = createRoot(requireElement('root'));

root.render(
    <StrictMode>
        <h1>{PROJECT_NAME}</h1>
    </StrictMode>,
);

await startLevelView(requireElement('level-view'), buildTestLevel());
