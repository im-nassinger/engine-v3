import './TriggerPlaceholder.css';

export type TriggerPlaceholderProps = {
    heightPx: number;
};

// A trigger too far from the view to draw yet: an empty block of its height, so the scrolling stays the same.
export function TriggerPlaceholder({ heightPx }: TriggerPlaceholderProps) {
    return <div className="trigger-placeholder" style={{ height: heightPx }} />;
}
