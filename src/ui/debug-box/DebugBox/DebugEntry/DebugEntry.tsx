import './DebugEntry.css';

export type DebugEntryProps = {
    label: string;
    value: string;
    // Keeps room for a usual coordinate, so the box doesn't change width as the mouse moves or leaves.
    holdsCoordinate?: boolean;
};

export function DebugEntry({ label, value, holdsCoordinate = false }: DebugEntryProps) {
    return (
        <span className="debug-entry" data-entry={label} data-holds-coordinate={holdsCoordinate}>
            <span className="label">{label}:</span>
            <span className="value">{value}</span>
        </span>
    );
}
