import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { TagsComponent, TriggerComponent, VariablesComponent } from '../../../core/components/index.ts';
import type { Trigger } from '../../../core/fields/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import {
    addBareEntity,
    cardOf,
    click,
    closeEntityInspectorPage,
    openEntityInspectorPage,
    select,
    showEntityInspector,
} from './testing/entityInspectorPage.ts';
import {
    bandPoint,
    blockBeside,
    lastGap,
    menuRowNamed,
    requireBlock,
    scriptBlocks,
    shownSlots,
    slotAt,
    slotButton,
    word,
} from './testing/triggerCardPage.ts';

// Adding a block on hover (design/controls.md, v4 fix 4, Adding a block anywhere): the bands and cursors, the
// 200 ms wait, the 400 ms open and close, the hovered block kept still, the scroll to a clipped slot, the
// empty strip and the glide back, and adding at a slot.

const DELAY_MS = 200;
const MOVE_MS = 200;
const FADE_MS = 200;
const OPEN_MS = 400;
const SETTLE_MS = 400;

const CORNER = { x: 0, y: 0 };

beforeEach(async () => {
    openEntityInspectorPage();
    await restMouseOutside();
});

afterEach(() => {
    vi.useRealTimers();
    closeEntityInspectorPage();
});

async function restMouseOutside() {
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    CORNER.x = corner.x;
    CORNER.y = corner.y;
    await userEvent.hover(document.documentElement, { position: corner, force: true });
}

function movePointerTo(block: HTMLElement, band: 'top' | 'middle' | 'bottom') {
    const { position } = bandPoint(block, band);
    const rect = block.getBoundingClientRect();
    const clientX = rect.left + position.x;
    const clientY = rect.top + position.y;
    const event = new PointerEvent('pointermove', { bubbles: true, clientX, clientY });
    block.dispatchEvent(event);
}

// The pointer leaves the script for the page around it.
function movePointerOut() {
    const box = requireBlock().querySelector('.trigger-script-box');
    if (box === null) throw new Error('No script box.');

    const event = new PointerEvent('pointerout', { bubbles: true, relatedTarget: document.body });
    box.dispatchEvent(event);
}

async function hoverBand(block: HTMLElement, band: 'top' | 'middle' | 'bottom') {
    await userEvent.hover(block, bandPoint(block, band));
}

const TIMED_DOOR: Trigger = {
    id: 1,
    name: 'Timed door',
    on: true,
    when: { kind: 'custom', name: 'open' },
    checks: [],
    actions: [
        {
            kind: 'change',
            target: { kind: 'this' },
            value: { kind: 'triggerOn', trigger: 1 },
            op: 'set',
            amount: false,
        },
        { kind: 'wait', seconds: 2 },
        { kind: 'change', target: { kind: 'this' }, value: { kind: 'triggerOn', trigger: 1 }, op: 'set', amount: true },
    ],
};

async function showDoor() {
    return showTrigger(TIMED_DOOR);
}

async function showTrigger(trigger: Trigger) {
    const level = Level.createNew();
    level.world.addComponent(new VariablesComponent({ variables: [{ name: 'coins', value: 0 }] }));
    const player = addBareEntity(level, 'Player');
    player.addComponent(new TagsComponent({ tags: ['player'] }));
    const door = addBareEntity(level, 'Door');
    door.addComponent(new TriggerComponent({ triggers: [trigger], nextTriggerId: 2 }));

    const shown = showEntityInspector(level);
    select(shown.session, [door]);
    await expect.poll(() => cardOf('TriggerComponent')).not.toBeNull();
    await expect.poll(() => scriptBlocks().length).toBe(trigger.actions.length + 1);

    return { ...shown, door };
}

function triggersOf(entity: Entity) {
    return entity.requireComponent(TriggerComponent).get('triggers');
}

function scriptOf() {
    const script = requireBlock().querySelector<HTMLElement>('.trigger-script-box > .script');
    if (script === null) throw new Error('No script.');

    return script;
}

function roomsOf() {
    return [...scriptOf().querySelectorAll<HTMLElement>(':scope > .room')];
}

type Sample<T> = { time: number; value: T };

// The timing tests stop the clock and run the animation frames themselves, FRAME_MS apart, so a busy test
// machine's long frames can't jump a slot open in one go. They move the pointer by hand too: a real one may
// be delivered late, after the clock has moved on.
const FRAME_MS = 16;

function stopTheClock() {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
}

// Runs `durationMs` of animation frames, reading a value after each, with the time it was read.
function runFrames<T>(durationMs: number, read: () => T) {
    const samples: Sample<T>[] = [];
    for (let elapsed = 0; elapsed < durationMs; elapsed += FRAME_MS) {
        vi.advanceTimersByTime(FRAME_MS);
        samples.push({ time: performance.now(), value: read() });
    }

    return samples;
}

type SlotLook = { isShown: boolean; height: number; opacity: number };

function slotLook(gap: number): SlotLook {
    const slot = slotAt(gap);
    if (slot === null) return { isShown: false, height: 0, opacity: 0 };

    const body = slot.querySelector<HTMLElement>('.body');
    const opacity = Number(body === null ? 0 : getComputedStyle(body).opacity);

    return { isShown: true, height: slot.getBoundingClientRect().height, opacity };
}

async function waitFullyOpen(gap: number) {
    await expect.poll(() => slotLook(gap).opacity, { timeout: 3000 }).toBe(1);
    await expect.poll(() => slotAt(gap)?.style.height, { timeout: 3000 }).toBe('');
}

function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

// Waits frame by frame, so the test sees the first frame `isDone` holds, not one a poll's interval later.
async function framesUntil(isDone: () => boolean) {
    const start = performance.now();
    while (!isDone()) {
        if (performance.now() - start > 3000) throw new Error('Timed out waiting frame by frame.');

        await nextFrame();
    }
}

function topOf(element: HTMLElement) {
    return element.getBoundingClientRect().top;
}

describe('adding a block on hover', () => {
    test('the cursor shows the band: up over the top third, down over the bottom, the plain arrow between', async () => {
        await showDoor();
        const wait = blockBeside(2, 'above');

        await hoverBand(wait, 'top');
        expect(getComputedStyle(wait).cursor).toBe('n-resize');
        await hoverBand(wait, 'bottom');
        expect(getComputedStyle(wait).cursor).toBe('s-resize');
        await hoverBand(wait, 'middle');
        expect(getComputedStyle(wait).cursor).toBe('auto');

        // The event block has nothing above it: its top third is like its middle.
        const event = scriptBlocks()[0] as HTMLElement;
        await hoverBand(event, 'top');
        expect(getComputedStyle(event).cursor).toBe('auto');
    });

    test("hovering under the last block, inside the script, opens the last gap's slot", async () => {
        await showTrigger({ ...TIMED_DOOR, actions: [{ kind: 'win' }] });
        const script = scriptOf();
        const last = scriptBlocks().at(-1) as HTMLElement;
        const below = last.getBoundingClientRect().bottom + 12;
        expect(below).toBeLessThan(script.getBoundingClientRect().bottom);

        const rect = script.getBoundingClientRect();
        await userEvent.hover(script, { position: { x: rect.width / 2, y: below - rect.top } });

        await expect.poll(() => slotAt(lastGap())).not.toBeNull();
    });

    test('a value box acts as the middle wherever it reaches: it opens no slot and closes an open one', async () => {
        await showDoor();
        const first = blockBeside(1, 'above');
        await hoverBand(first, 'bottom');
        await waitFullyOpen(1);

        await userEvent.hover(word('Do', 'off'));
        expect(first.dataset['band']).toBe('middle');
        await expect.poll(() => shownSlots(), { timeout: 3000 }).toHaveLength(0);
    });

    test('nothing moves for 200 ms, then the blocks move apart for 200 ms and the slot fades in for 200 ms', async () => {
        await showDoor();
        stopTheClock();
        const start = performance.now();
        movePointerTo(blockBeside(2, 'above'), 'bottom');
        const samples = runFrames(1000, () => slotLook(2));

        const shown = samples.filter((sample) => sample.value.isShown);
        const firstShown = shown[0] as Sample<SlotLook>;
        const fullHeight = (shown.at(-1) as Sample<SlotLook>).value.height;
        const firstFaded = shown.find((sample) => sample.value.opacity > 0) as Sample<SlotLook>;
        const fullyOpen = shown.find((sample) => sample.value.opacity === 1) as Sample<SlotLook>;

        expect(firstShown.time - start).toBeGreaterThanOrEqual(DELAY_MS);
        expect(firstShown.time - start).toBeLessThanOrEqual(DELAY_MS + 2 * FRAME_MS);
        // While the room grows the slot stays clear, growing slowly, then faster; it fades in once the room is
        // full.
        const growing = shown.filter((sample) => sample.value.height < fullHeight - 0.5);
        expect(growing.every((sample) => sample.value.opacity === 0)).toBe(true);
        expect((growing[0] as Sample<SlotLook>).value.height).toBeLessThan(fullHeight / 10);
        expect(firstFaded.time - firstShown.time).toBeGreaterThanOrEqual(MOVE_MS - FRAME_MS);
        expect(fullyOpen.time - firstShown.time).toBeGreaterThanOrEqual(OPEN_MS - FRAME_MS);
        expect(fullyOpen.time - firstShown.time).toBeLessThanOrEqual(OPEN_MS + FRAME_MS);
        expect(slotAt(2)?.style.height).toBe('');
    });

    test('closing runs the other way: after 200 ms the slot fades out, then its room shrinks', async () => {
        await showDoor();
        stopTheClock();
        const above = blockBeside(2, 'above');
        movePointerTo(above, 'bottom');
        runFrames(1000, () => undefined);
        expect(slotLook(2).opacity).toBe(1);

        const start = performance.now();
        movePointerTo(above, 'middle');
        const samples = runFrames(1000, () => slotLook(2));

        const fading = samples.filter((sample) => sample.value.isShown && sample.value.opacity < 1);
        const firstFading = fading[0] as Sample<SlotLook>;
        const firstShrinking = fading.find((sample) => sample.value.opacity === 0) as Sample<SlotLook>;
        const gone = samples.find((sample) => !sample.value.isShown) as Sample<SlotLook>;
        expect(firstFading.time - start).toBeGreaterThanOrEqual(DELAY_MS);
        expect(firstShrinking.time - firstFading.time).toBeGreaterThanOrEqual(FADE_MS - FRAME_MS);
        expect(gone.time - firstFading.time).toBeGreaterThanOrEqual(OPEN_MS - FRAME_MS);
    });

    // A real slow frame, not the stopped clock: the slot's first frames are its costliest, and one long frame
    // must not jump it most of the way open, which looks instant.
    test('a slow frame as the slot starts opening moves it one frame, not the time it took', async () => {
        await showDoor();
        movePointerTo(blockBeside(1, 'above'), 'bottom');
        await framesUntil(() => slotAt(1) !== null);
        const start = performance.now();
        while (performance.now() - start < 150) {
            // The page is busy for 150 ms.
        }
        await nextFrame();
        const afterSlowFrame = slotLook(1).height;

        await waitFullyOpen(1);
        expect(afterSlowFrame).toBeLessThan(slotLook(1).height / 2);
    });

    test('a mouse passing over a block for less than 200 ms opens nothing', async () => {
        await showDoor();
        stopTheClock();
        const block = blockBeside(2, 'above');
        movePointerTo(block, 'bottom');
        const passing = runFrames(DELAY_MS - 2 * FRAME_MS, () => shownSlots().length);
        movePointerTo(block, 'middle');
        const after = runFrames(1000, () => shownSlots().length);

        const counts = [...passing, ...after].map((sample) => sample.value);
        expect(counts.every((count) => count === 0)).toBe(true);
    });

    test('the hovered block never moves while a slot opens above it', async () => {
        await showDoor();
        stopTheClock();
        const wait = blockBeside(2, 'above');
        const before = topOf(wait);

        movePointerTo(wait, 'top');
        const samples = runFrames(1000, () => topOf(wait));

        expect(slotLook(1).opacity).toBe(1);
        await expect.poll(() => getComputedStyle(wait).cursor).toBe('n-resize');
        for (const sample of samples) {
            expect(Math.abs(sample.value - before)).toBeLessThanOrEqual(1);
        }
        expect(scriptOf().scrollTop).toBeGreaterThan(0);
    });

    // Shorter than its least height, the script can't scroll yet: the strip below the blocks has to fill the
    // empty space first, or the hovered block moves down, then jumps back with the slot most of the way open.
    test('the hovered block never moves in a script shorter than its least height', async () => {
        await showTrigger({ ...TIMED_DOOR, actions: [{ kind: 'wait', seconds: 2 }] });
        stopTheClock();
        const wait = blockBeside(0, 'below');
        const before = topOf(wait);

        movePointerTo(wait, 'top');
        const samples = runFrames(DELAY_MS + MOVE_MS - 2 * FRAME_MS, () => topOf(wait));

        // Near full height the slot reaches the script's top edge and is scrolled up to 4 px clear of it, the block
        // moving with it by design. Without the room filling the empty space first, it moved 17 px.
        expect(slotLook(0).height).toBeGreaterThan(10);
        const furthest = Math.max(...samples.map((sample) => Math.abs(sample.value - before)));
        expect(furthest).toBeLessThanOrEqual(4);
    });

    test('the script keeps its height while a slot is open, and a clipped slot is scrolled into view', async () => {
        await showDoor();
        const script = scriptOf();
        const height = script.offsetHeight;
        const last = blockBeside(3, 'above');

        await hoverBand(last, 'bottom');
        await waitFullyOpen(3);
        await expect.poll(() => slotBottomInView(3), { timeout: 3000 }).toBe(true);

        expect(script.offsetHeight).toBe(height);
        expect(script.scrollTop).toBeGreaterThan(0);
    });

    test('where the script cannot scroll far enough an empty strip makes the room, and it glides back', async () => {
        await showDoor();
        stopTheClock();
        const first = blockBeside(0, 'below');
        movePointerTo(first, 'top');
        runFrames(1000, () => undefined);
        expect(slotLook(0).opacity).toBe(1);

        // The slot above closes while the block stays put: the script has no scroll left above, so an empty
        // strip above the blocks takes the slot's place.
        const before = topOf(first);
        movePointerTo(first, 'middle');
        runFrames(1000, () => undefined);
        expect(slotAt(0)).toBeNull();
        const [topRoom] = roomsOf();
        const roomHeight = () => (topRoom as HTMLElement).offsetHeight;
        expect(roomHeight()).toBeGreaterThan(0);
        expect(Math.abs(topOf(first) - before)).toBeLessThanOrEqual(1);

        const full = roomHeight();
        const start = performance.now();
        movePointerOut();
        const samples = runFrames(1000, roomHeight);

        const between = samples.filter((sample) => sample.value > 0 && sample.value < full);
        const gone = samples.find((sample) => sample.value === 0) as Sample<number>;
        expect(between.length).toBeGreaterThan(1);
        expect(gone.time - start).toBeGreaterThanOrEqual(SETTLE_MS);
        expect(scriptOf().scrollTop).toBe(0);
    });

    test('clicking a slot opens the add menu, which keeps the slot open, and adds the block there as one step', async () => {
        const { session, door } = await showDoor();
        await hoverBand(blockBeside(1, 'above'), 'bottom');
        await waitFullyOpen(1);
        click(slotButton(1));
        await expect.poll(() => menuRowNamed('win')).toBeDefined();

        await userEvent.hover(document.documentElement, { position: CORNER, force: true });
        await new Promise((resolve) => setTimeout(resolve, OPEN_MS));
        expect(slotAt(1)).not.toBeNull();

        menuRowNamed('win')?.click();
        await expect
            .poll(() => triggersOf(door)[0]?.actions.map((action) => action.kind))
            .toEqual(['change', 'win', 'wait', 'change']);
        expect(session.openLevel.history.undoCount).toBe(1);
        expect(shownSlots()).toHaveLength(0);
    });

    test('a check added with no If wraps every action in one', async () => {
        const { session, door } = await showDoor();
        await hoverBand(blockBeside(2, 'above'), 'bottom');
        await waitFullyOpen(2);
        click(slotButton(2));
        await expect.poll(() => menuRowNamed('if … (a value)')).toBeDefined();
        menuRowNamed('if … (a value)')?.click();

        await expect.poll(() => triggersOf(door)[0]?.checks).toHaveLength(1);
        expect(triggersOf(door)[0]?.actions).toHaveLength(3);
        expect(session.openLevel.history.undoCount).toBe(1);
        const inside = requireBlock().querySelectorAll('.script-if > .middle > .inner > .script-block');
        expect(inside).toHaveLength(3);
    });
});

function slotBottomInView(gap: number) {
    const slot = slotAt(gap);
    if (slot === null) return false;

    const view = scriptOf().getBoundingClientRect();
    const rect = slot.getBoundingClientRect();
    return rect.bottom <= view.bottom + 0.5 && rect.top >= view.top - 0.5;
}
