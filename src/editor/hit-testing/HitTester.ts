import type { DerivedCaches } from '../../core/derived/index.ts';
import { Bounds } from '../../core/geometry/index.ts';
import type { Point } from '../../core/geometry/index.ts';
import type { Entity, Level } from '../../core/level/index.ts';
import type { ViewSettings } from '../view/index.ts';
import { jointIconRadiusPx } from '../view/index.ts';
import { HitAreas } from './areas/HitAreas.ts';
import type { HitAreaContext } from './areas/HitAreas.ts';
import type { HitProbe } from './HitProbe.ts';
import type { SpatialIndex } from './spatial-index/SpatialIndex.ts';

// The requirement's "at least 5 px of tolerance at any zoom".
export const HIT_TOLERANCE_PX = 5;

// Answers "what is under this point" and "what does this box touch" with the requirement's hit areas.
// Clicks pass through the World, hidden and locked entities unless the probe asks for them, and entities
// inside the camera unless you are inside the camera. What is inside the camera is drawn over the level, so it is in front there.
export class HitTester {
    private readonly level: Level;
    private readonly caches: DerivedCaches;
    private readonly index: SpatialIndex;
    private readonly settings: ViewSettings;

    constructor(level: Level, caches: DerivedCaches, index: SpatialIndex, settings: ViewSettings) {
        this.level = level;
        this.caches = caches;
        this.index = index;
        this.settings = settings;
    }

    topmostAt(point: Point, probe: HitProbe) {
        const area = new Bounds(point.x, point.y, point.x, point.y);
        const context = this.contextFor(probe);

        for (const entity of this.candidatesFrontToBack(area, probe)) {
            const hitArea = HitAreas.of(entity, context);
            if (hitArea?.touchesPoint(point) === true) return entity;
        }

        return undefined;
    }

    // Front to back. v3's Alt+click walks this list.
    allAt(point: Point, probe: HitProbe) {
        const area = new Bounds(point.x, point.y, point.x, point.y);
        const context = this.contextFor(probe);

        return this.candidatesFrontToBack(area, probe).filter((entity) => {
            const hitArea = HitAreas.of(entity, context);
            return hitArea?.touchesPoint(point) === true;
        });
    }

    // Every entity whose hit area the selection box touches, front to back. Groups never appear; the
    // caller turns each one into what it selects through selectableFor.
    allTouching(box: Bounds, probe: HitProbe) {
        const context = this.contextFor(probe);

        return this.candidatesFrontToBack(box, probe).filter((entity) => {
            const hitArea = HitAreas.of(entity, context);
            return hitArea?.touchesBox(box) === true;
        });
    }

    // What a hit selects, seen from the group you are inside: its ancestor directly inside that group, or
    // with insideGroups (Ctrl's box) the hit itself. A hit outside the group selects nothing.
    selectableFor(hit: Entity, currentGroup: Entity, insideGroups: boolean) {
        if (!currentGroup.isAncestorOf(hit)) return undefined;
        if (insideGroups) return hit;

        let selectable = hit;
        let parent = selectable.parent;

        while (parent !== undefined && parent !== currentGroup) {
            selectable = parent;
            parent = selectable.parent;
        }

        return selectable;
    }

    private contextFor(probe: HitProbe): HitAreaContext {
        return {
            caches: this.caches,
            settings: this.settings,
            levelPerScreenPx: 1 / probe.zoom,
            tolerancePx: HIT_TOLERANCE_PX,
        };
    }

    private candidatesFrontToBack(area: Bounds, probe: HitProbe) {
        // How far outside its cached bounds an entity can still be hit: the tolerance, or a joint's icon.
        const widestReachPx = Math.max(HIT_TOLERANCE_PX, jointIconRadiusPx(probe.zoom));
        const reach = widestReachPx / probe.zoom;
        const searchArea = area.expandedBy(reach);
        const insideTheCamera: Entity[] = [];
        const inTheLevel: Entity[] = [];

        for (const entity of this.index.query(searchArea)) {
            if (!this.canBeHit(entity, searchArea, probe)) continue;

            if (this.isInsideTheCamera(entity)) {
                insideTheCamera.push(entity);
            } else {
                inTheLevel.push(entity);
            }
        }

        const backToFront = [...inTheLevel, ...insideTheCamera];
        return backToFront.reverse();
    }

    private canBeHit(entity: Entity, searchArea: Bounds, probe: HitProbe) {
        if (entity === this.level.world) return false;

        const bounds = this.caches.bounds.ownBoundsOf(entity);
        if (bounds === undefined || !bounds.overlaps(searchArea)) return false;

        if (probe.reachHiddenAndLocked !== true && this.isHiddenOrLocked(entity)) return false;

        const reachesTheCamera = this.isInsideOrIsTheCamera(probe.currentGroup);
        if (this.isInsideTheCamera(entity) && !reachesTheCamera) return false;

        return true;
    }

    private isHiddenOrLocked(entity: Entity) {
        return this.caches.hidden.isHidden(entity) || this.caches.hidden.isLocked(entity);
    }

    private isInsideTheCamera(entity: Entity) {
        return this.level.camera.isAncestorOf(entity);
    }

    private isInsideOrIsTheCamera(entity: Entity) {
        return entity === this.level.camera || this.isInsideTheCamera(entity);
    }
}
