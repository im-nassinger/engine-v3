import type { JointType } from '../../../core/components/index.ts';
import { VersionCounter } from '../../../core/events/index.ts';
import type { Point } from '../../../core/geometry/index.ts';
import { labelName } from '../../../core/level/index.ts';
import type { EntityId } from '../../../core/level/index.ts';
import { placeJoint } from '../../commands/index.ts';
import type { JointPlacement } from '../../commands/index.ts';
import { READ_ONLY_REASON } from '../../history/index.ts';
import { PointSnapper } from '../../snapping/index.ts';
import type { LevelPointerInput, Modifiers, Tool, ToolContext, ToolKey } from '../Tool.ts';

import { bodiesUnder } from './bodiesUnder.ts';
import { pickBodyA } from './pickBodyA.ts';
import type { JointEnd } from './pickBodyA.ts';

// What the tool draws over the level, in level positions: the first click's end of a Rope or Spring, the
// snapped mouse, the entities a click would join, and a label such as "Hinge: Wheel to Car". b is null for
// the background, and undefined while nothing is chosen for it.
export type JointPreview = {
    readonly type: JointType;
    readonly ends: readonly Point[];
    readonly mouse: Point;
    readonly a: EntityId | undefined;
    readonly b: EntityId | null | undefined;
    readonly label: string | undefined;
};

export const NOTHING_HERE = 'Nothing with physics here';

const LOCKED = 'This group is locked';

const TYPE_WORDS: Readonly<Record<JointType, string>> = {
    hinge: 'Hinge',
    rope: 'Rope',
    spring: 'Spring',
};

const CTRL_CODES = new Set(['ControlLeft', 'ControlRight', 'MetaLeft', 'MetaRight']);

// What a click at the mouse would do.
type ClickPlan =
    // Nothing under the mouse to start a joint on; skipped says why, when an entity there is skipped.
    | { readonly kind: 'nothing'; readonly at: Point; readonly skipped: string | undefined }
    // A Rope or Spring's first end.
    | { readonly kind: 'first'; readonly end: JointEnd }
    // A second click on the first end's body, which does nothing and keeps waiting.
    | { readonly kind: 'wait'; readonly at: Point }
    // A second click on an entity the tool skips, refused rather than pinning that end to the background.
    | { readonly kind: 'refused'; readonly at: Point; readonly reason: string }
    // An empty b is the background, its end at the mouse.
    | { readonly kind: 'place'; readonly at: Point; readonly a: JointEnd; readonly b: JointEnd | undefined };

type PlacePlan = Extract<ClickPlan, { readonly kind: 'place' }>;

// Places a Hinge with one click, where two bodies overlap or on one to pin it, and a Rope or Spring with
// two, one on each body, or the second on empty space to hang from the background. The smaller body is A.
// Over an entity it skips, with no body to use there, the preview's label and a click's status text say
// why, such as "Platform is locked", and a second end there is refused.
// Ends snap to the centres and corners of the entities under the mouse, then the grid; Ctrl turns both
// off. Placing runs placeJoint, one step, and the controller selects the joint and returns to Select
// unless the tool is locked.
export class JointTool implements Tool {
    readonly id = 'joint';
    readonly preview = new VersionCounter();
    // Moves when the type changes, for the kinds menu.
    readonly options = new VersionCounter();
    private chosenType: JointType = 'hinge';
    private context: ToolContext | undefined;
    // A Rope or Spring's first end, until the second click.
    private first: JointEnd | undefined;
    private press: LevelPointerInput | undefined;
    // The last mouse position heard, so Ctrl redraws the preview without a move.
    private lastInput: LevelPointerInput | undefined;
    private shown: JointPreview | undefined;

    get type() {
        return this.chosenType;
    }

    // What the overlay draws.
    get drawing() {
        return this.shown;
    }

    // The kinds menu. A first click is dropped, since its joint is no longer the one chosen.
    chooseType(type: JointType) {
        if (type === this.chosenType) return;

        this.chosenType = type;
        this.first = undefined;
        this.options.increment();
        this.showHover();
    }

    activate(context: ToolContext) {
        this.context = context;
        context.openLevel.selection.clear();
    }

    deactivate() {
        this.first = undefined;
        this.press = undefined;
        this.lastInput = undefined;
        this.show(undefined);
    }

    pointerDown(input: LevelPointerInput) {
        if (this.context === undefined || input.button !== 'left' || this.press !== undefined) return;

        this.press = input;
        this.lastInput = input;
    }

    pointerMove(input: LevelPointerInput) {
        this.lastInput = input;
        this.showHover();
    }

    // A click acts where it was pressed.
    pointerUp(input: LevelPointerInput) {
        const press = this.press;
        if (input.button !== 'left' || press === undefined) return;

        this.press = undefined;
        this.click(press);
    }

    // Ctrl changes the snapped point at once, without waiting for the mouse to move.
    keyDown(key: ToolKey) {
        this.redrawFor(key);

        return false;
    }

    keyUp(key: ToolKey) {
        this.redrawFor(key);
    }

    // Ctrl+Z drops a first click, as Esc does, and makes no step.
    undoDrawingStep() {
        return this.dropFirst();
    }

    // Esc drops a first click.
    cancel() {
        this.press = undefined;

        return this.dropFirst();
    }

    private dropFirst() {
        if (this.first === undefined) return false;

        this.first = undefined;
        this.showHover();

        return true;
    }

    private click(input: LevelPointerInput) {
        const context = this.context;
        if (context === undefined) return;

        const reason = lockedReason(context);
        if (reason !== undefined) {
            context.status.show(reason);
            return;
        }

        const plan = this.planAt(input.levelPosition, input.modifiers);
        switch (plan.kind) {
            case 'nothing':
                context.status.show(plan.skipped ?? NOTHING_HERE);
                return;
            case 'refused':
                context.status.show(plan.reason);
                return;
            case 'wait':
                return;
            case 'first':
                this.first = plan.end;
                this.showHover();
                return;
            case 'place':
                this.place(context, plan);
                return;
        }
    }

    private place(context: ToolContext, plan: PlacePlan) {
        const placement = this.placementOf(plan);
        this.first = undefined;
        this.showHover();

        const outcome = placeJoint(context.openLevel, context.reader, placement);
        if (outcome.kind === 'refused') {
            context.status.show(outcome.reason);
            return;
        }

        context.finished([outcome.id]);
    }

    private placementOf({ a, b, at }: PlacePlan): JointPlacement {
        const links = { a: a.body.id, b: b?.body.id ?? null };
        if (this.chosenType === 'hinge') return { type: 'hinge', ...links, at };

        return { type: this.chosenType, ...links, endA: a.at, endB: b?.at ?? at };
    }

    // The bodies are found under the mouse itself; the end is the snapped point. The two frontmost bodies
    // are used.
    private planAt(levelPosition: Point, modifiers: Modifiers): ClickPlan {
        const context = this.context;
        if (context === undefined) return { kind: 'nothing', at: levelPosition, skipped: undefined };

        const { openLevel, view, snapper } = context;
        const under = bodiesUnder(openLevel, levelPosition, view.zoom);
        const pointSnapper = new PointSnapper(openLevel.caches, snapper);
        const at = pointSnapper.snapPoint(levelPosition, under.hits, view, { ctrlHeld: modifiers.ctrl }).point;
        const [front, behind] = under.bodies;
        const caches = openLevel.caches;

        const first = this.first;
        if (first !== undefined) {
            const other = under.bodies.find((body) => body !== first.body);
            if (other !== undefined) return { kind: 'place', at, ...pickBodyA(first, { body: other, at }, caches) };
            if (front !== undefined) return { kind: 'wait', at };
            if (under.skipped !== undefined) return { kind: 'refused', at, reason: under.skipped };

            return { kind: 'place', at, a: first, b: undefined };
        }

        if (front === undefined) return { kind: 'nothing', at, skipped: under.skipped };
        if (this.chosenType !== 'hinge') return { kind: 'first', end: { body: front, at } };
        if (behind === undefined) return { kind: 'place', at, a: { body: front, at }, b: undefined };

        return { kind: 'place', at, ...pickBodyA({ body: front, at }, { body: behind, at }, caches) };
    }

    private redrawFor(key: ToolKey) {
        const input = this.lastInput;
        if (!CTRL_CODES.has(key.code) || input === undefined) return;

        this.lastInput = { ...input, modifiers: { shift: key.shift, alt: key.alt, ctrl: key.ctrl } };
        this.showHover();
    }

    private showHover() {
        const input = this.lastInput;
        if (input === undefined) {
            this.show(undefined);
            return;
        }

        this.show(this.previewOf(this.planAt(input.levelPosition, input.modifiers)));
    }

    private previewOf(plan: ClickPlan): JointPreview {
        const type = this.chosenType;
        const word = TYPE_WORDS[type];
        const ends = this.first === undefined ? [] : [this.first.at];
        const waiting = { type, ends, b: undefined };

        switch (plan.kind) {
            case 'nothing':
                return { ...waiting, mouse: plan.at, a: undefined, label: plan.skipped };
            case 'refused':
                return { ...waiting, mouse: plan.at, a: this.first?.body.id, label: plan.reason };
            case 'first':
                return { ...waiting, mouse: plan.end.at, a: plan.end.body.id, label: `${word}: ${nameOf(plan.end)}` };
            case 'wait': {
                const first = this.first;
                const label = first === undefined ? undefined : `${word}: ${nameOf(first)}`;
                return { ...waiting, mouse: plan.at, a: first?.body.id, label };
            }
            case 'place': {
                const bName = plan.b === undefined ? 'background' : nameOf(plan.b);
                const label = `${word}: ${nameOf(plan.a)} to ${bName}`;
                return { type, ends, mouse: plan.at, a: plan.a.body.id, b: plan.b?.body.id ?? null, label };
            }
        }
    }

    private show(next: JointPreview | undefined) {
        if (next === undefined && this.shown === undefined) return;
        if (next !== undefined && this.shown !== undefined && samePreview(next, this.shown)) return;

        this.shown = next;
        this.preview.increment();
    }
}

function nameOf(end: JointEnd) {
    return labelName(end.body);
}

function samePreview(one: JointPreview, other: JointPreview) {
    const sameEnds =
        one.ends.length === other.ends.length && one.ends.every((end, index) => samePoint(end, other.ends[index]));

    return (
        one.type === other.type &&
        sameEnds &&
        samePoint(one.mouse, other.mouse) &&
        one.a === other.a &&
        one.b === other.b &&
        one.label === other.label
    );
}

function samePoint(one: Point, other: Point | undefined) {
    return other !== undefined && one.x === other.x && one.y === other.y;
}

function lockedReason(context: ToolContext) {
    const { currentGroup, caches, editor } = context.openLevel;
    if (editor.isReadOnly) return READ_ONLY_REASON;
    if (caches.hidden.isLocked(currentGroup.group)) return LOCKED;

    return undefined;
}
