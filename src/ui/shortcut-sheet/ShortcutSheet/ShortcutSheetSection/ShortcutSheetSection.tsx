import type { ShortcutSection } from '../../../../editor/shortcuts/index.ts';
import { ShortcutSheetRow } from './ShortcutSheetRow/index.ts';
import './ShortcutSheetSection.css';

export type ShortcutSheetSectionProps = {
    section: ShortcutSection;
};

// One area of the shortcut list: its title in small caps, then its rows.
export function ShortcutSheetSection({ section }: ShortcutSheetSectionProps) {
    return (
        <section className="shortcut-sheet-section" aria-label={section.area}>
            <h3 className="title">{section.area}</h3>
            {section.rows.map((row) => (
                <ShortcutSheetRow key={row.name} row={row} />
            ))}
        </section>
    );
}
