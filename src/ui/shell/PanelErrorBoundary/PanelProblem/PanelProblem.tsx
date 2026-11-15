import { Button } from '../../../shared/index.ts';
import './PanelProblem.css';

// The level lives outside React, so reloading the page loses nothing the browser has saved.
export function PanelProblem() {
    const reload = () => window.location.reload();

    return (
        <div className="panel-problem" role="alert">
            <span className="message">This panel hit a problem. Your level is safe.</span>
            <Button label="Reload" onClick={reload} />
        </div>
    );
}
