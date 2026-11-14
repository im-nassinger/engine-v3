import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const PROJECT_NAME = 'engine-v3';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('The page has no #root element.');

const root = createRoot(rootElement);

root.render(
    <StrictMode>
        <h1>{PROJECT_NAME}</h1>
    </StrictMode>,
);
