import { TriangleAlert } from 'lucide-react';
import { useEditorSession } from '../../EditorContext.tsx';
import { useReading } from '../../hooks/index.ts';
import { useSaveIndicator } from '../../save-state/index.ts';
import { Icon } from '../../shared/index.ts';
import './MessagePill.css';

// The status text while there is one, and otherwise a failed save until it is fixed. The root stays on the
// page without a message, since screen readers only announce changes inside a status they already know.
export function MessagePill() {
    const session = useEditorSession();
    const indicator = useSaveIndicator();

    const readStatusText = () => session.status.current;
    const readFailedSave = () => indicator.failedSaveText;
    const statusText = useReading(session.status.version, readStatusText);
    const failedSaveText = useReading(indicator.version, readFailedSave);

    const text = statusText ?? failedSaveText;
    const isFailedSave = statusText === undefined && failedSaveText !== undefined;

    return (
        <div className="message-pill" role="status">
            {text !== undefined && (
                <p className="message" data-failed-save={isFailedSave}>
                    {isFailedSave && <Icon icon={TriangleAlert} size="small" />}
                    {text}
                </p>
            )}
        </div>
    );
}
