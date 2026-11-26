import { useSyncExternalStore } from 'react';
import { pixelsPerMetreOf } from '../../core/physics/index.ts';
import { LengthDisplay } from '../../editor/units/index.ts';
import { useEditorSession } from '../EditorContext.tsx';
import { useReading } from './useReading.ts';
import { useVersion } from './useVersion.ts';

// How lengths show now: ☰'s unit at the open level World's Pixels per metre. Redraws when either changes,
// or when New or Import opens another level.
export function useLengthDisplay() {
    const session = useEditorSession();
    useVersion(session.openLevelChanged);
    const level = session.openLevel.level;
    const viewSettings = session.viewSettings;

    const readUnit = () => viewSettings.lengthUnit;
    const lengthUnit = useReading(viewSettings.version, readUnit);

    const world = level.world;
    const entityVersions = level.signals.entityVersions;
    const subscribe = (listener: () => void) => entityVersions.subscribe(world.id, listener);
    const readScale = () => pixelsPerMetreOf(world);
    const pixelsPerMetre = useSyncExternalStore(subscribe, readScale);

    return new LengthDisplay(lengthUnit, pixelsPerMetre);
}
