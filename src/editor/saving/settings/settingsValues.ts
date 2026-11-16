import type { ComponentTypeName } from '../../../core/components/index.ts';
import { MAX_ZOOM, MIN_ZOOM } from '../../view/index.ts';
import type { ViewSwitch, ViewSwitches } from '../../view/index.ts';

// Where the level view was: the level position at its middle, and its zoom.
export type SavedView = {
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
};

const VIEW_SWITCH_NAMES: readonly ViewSwitch[] = ['grid', 'gridSnapping', 'jointIcons', 'cameraFrame', 'physicsView'];

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// The settings' JSON object, or an empty one when the text is missing or isn't an object.
export function parseSettingsText(text: string | undefined): Record<string, unknown> {
    if (text === undefined) return {};

    try {
        const parsed: unknown = JSON.parse(text);
        if (!isRecord(parsed)) return {};

        return parsed;
    } catch {
        return {};
    }
}

// A view with a coordinate that isn't a finite number, or a zoom the editor can't show, is damaged as a whole.
export function readSavedView(value: unknown): SavedView | undefined {
    if (!isRecord(value)) return undefined;

    const { x, y, zoom } = value;
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(zoom)) return undefined;

    const zoomShowable = zoom >= MIN_ZOOM && zoom <= MAX_ZOOM;
    if (!zoomShowable) return undefined;

    return { x, y, zoom };
}

// Each switch is checked on its own: one that is missing or not a boolean keeps its default.
export function readViewSwitches(value: unknown, defaults: ViewSwitches): ViewSwitches {
    const switches = { ...defaults };
    if (!isRecord(value)) return switches;

    for (const name of VIEW_SWITCH_NAMES) {
        const saved = value[name];
        if (typeof saved !== 'boolean') continue;

        switches[name] = saved;
    }

    return switches;
}

// Only names that can be a component type's are kept, so a damaged entry drops alone.
export function readFoldedCards(value: unknown): ComponentTypeName[] {
    if (!Array.isArray(value)) return [];

    const folded: ComponentTypeName[] = [];
    for (const entry of value) {
        if (!isComponentTypeName(entry)) continue;
        if (folded.includes(entry)) continue;

        folded.push(entry);
    }

    return folded;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isComponentTypeName(value: unknown): value is ComponentTypeName {
    if (typeof value !== 'string') return false;

    const hasName = value.length > 'Component'.length;
    return hasName && value.endsWith('Component');
}
