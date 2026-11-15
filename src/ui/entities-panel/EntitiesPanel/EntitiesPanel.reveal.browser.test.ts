import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { CommandRunner, createCommandRegistry } from '../../../editor/commands/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import {
    addNamedEntity,
    buildLevel,
    closePanelPage,
    createSession,
    findRow,
    mountPanel,
    openPanelPage,
    rowNamed,
    showPanel,
    shownRows,
} from './testing/panelPage.ts';

// The target in performance.md: the panel paints its first rows within 0.2 s of mounting.
const OPEN_TIME_LIMIT_MS = 200;

beforeEach(openPanelPage);
afterEach(closePanelPage);

function selectedRows() {
    return shownRows().filter((row) => row.getAttribute('aria-selected') === 'true');
}

function runGroup(session: EditorSession) {
    const registry = createCommandRegistry(session);
    const group = registry.find('arrange.group');
    if (group === undefined) throw new Error('Group is registered.');

    const runner = new CommandRunner(session.status);
    runner.run(group);
}

// Resolves in the first animation frame that finds a row, which is the frame that paints it.
function firstFrameWithRows() {
    return new Promise<number>((resolve) => {
        const lookForRows = () => {
            if (shownRows().length > 0) {
                resolve(performance.now());
                return;
            }

            requestAnimationFrame(lookForRows);
        };

        requestAnimationFrame(lookForRows);
    });
}

describe('revealing rows', () => {
    test("Group's new group inside folded rows is unfolded and scrolled into view", async () => {
        const { level } = buildLevel(10_000);
        // Last among the World's children, so its rows are the last ones, far below the screen.
        const shelf = level.createEntity(level.world, level.world.children.length);
        const jar = addNamedEntity(level, 'Jar', shelf);
        const lid = addNamedEntity(level, 'Lid', shelf);
        const session = showPanel(level);
        await expect.poll(() => findRow('World')).toBeDefined();

        session.openLevel.selection.replace([jar.id, lid.id]);
        level.editorData.setFolded(shelf.id, true);
        await expect.poll(() => findRow('Jar')).toBeUndefined();

        runGroup(session);

        const groupId = session.openLevel.selection.ids[0];
        if (groupId === undefined) throw new Error('Group selects its new group.');

        expect(level.editorData.isFolded(shelf.id)).toBe(false);
        await expect.poll(() => selectedRows().length).toBe(1);
        expect(session.openLevel.entitiesRows.indexOf(groupId)).toBeGreaterThan(10_000);
    });

    test('a click on a row inside the list never scrolls or unfolds', async () => {
        const { level } = buildLevel(100);
        const session = showPanel(level);
        await expect.poll(() => findRow('Crate 90')).toBeDefined();

        const list = document.querySelector('.entities-list');
        if (list === null) throw new Error('The list is shown.');
        const scrollTop = list.scrollTop;
        rowNamed('Crate 90').dispatchEvent(new MouseEvent('click', { bubbles: true }));

        await expect.poll(() => rowNamed('Crate 90').getAttribute('aria-selected')).toBe('true');
        expect(list.scrollTop).toBe(scrollTop);
        expect(session.openLevel.selectionReveal.entityId).toBeUndefined();
    });

    test('at 10,000 entities the panel paints its first rows within 0.2 s of mounting', async () => {
        const { level } = buildLevel(10_000);
        const session = createSession(level);

        const mountedAt = performance.now();
        mountPanel(session);
        const paintedAt = await firstFrameWithRows();
        const openTimeMs = paintedAt - mountedAt;

        console.info(`The Entities panel's open time at 10,000 entities: ${openTimeMs.toFixed(1)} ms`);
        expect(openTimeMs).toBeLessThan(OPEN_TIME_LIMIT_MS);
    });
});
