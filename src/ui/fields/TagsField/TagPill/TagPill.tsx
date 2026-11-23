import { X } from 'lucide-react';
import { Icon, Tooltip } from '../../../shared/index.ts';
import './TagPill.css';

export type TagPillProps = {
    tag: string;
    isEnabled: boolean;
    onRemove: (tag: string) => void;
};

// One tag in the tags field, with the × that removes it.
export function TagPill({ tag, isEnabled, onRemove }: TagPillProps) {
    return (
        <span className="tag-pill">
            <span className="text">{tag}</span>
            <Tooltip label={`Remove tag ${tag}`}>
                <button
                    type="button"
                    className="remove"
                    aria-label={`Remove tag ${tag}`}
                    disabled={!isEnabled}
                    onClick={() => onRemove(tag)}
                >
                    <Icon icon={X} size="small" />
                </button>
            </Tooltip>
        </span>
    );
}
