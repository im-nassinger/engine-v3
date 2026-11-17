import { Box2dPhysicsEngine } from '../../../src/adapters/box2d/index.ts';

import { bundledLevelFile, bundledLevelNames, bundledRecordedHashes } from '../bundled/bundledLevels.ts';
import { describeDifference } from '../compare/describeDifference.ts';
import { firstDifference } from '../compare/firstDifference.ts';
import { runLevel } from '../run/determinismRun.ts';

// The tech notes' phone check: every determinism level run in this browser, each row showing its hashes
// against the recorded ones. A Playwright test opens it at phone sizes and on CI's ARM runner.

type LevelResult = { ticks: number; lastHash: string; result: 'matches' | 'differs' | 'failed'; note: string };

function element<T extends HTMLElement>(id: string) {
    const found = document.getElementById(id);
    if (found === null) throw new Error(`The page has no #${id}.`);

    return found as T;
}

function checkLevel(engine: Box2dPhysicsEngine, name: string): LevelResult {
    const levelData = bundledLevelFile(name);
    const recorded = bundledRecordedHashes(name);
    const ticks = runLevel(levelData, engine);
    const lastHash = ticks.at(-1)?.hash ?? '';
    const difference = describeDifference(levelData, firstDifference(ticks, recorded));
    if (difference === undefined) return { ticks: ticks.length, lastHash, result: 'matches', note: 'matches' };

    return { ticks: ticks.length, lastHash, result: 'differs', note: `differs at ${difference}` };
}

function showRow(name: string, levelResult: LevelResult) {
    const row = document.createElement('tr');
    row.dataset['level'] = name;
    row.dataset['result'] = levelResult.result;
    for (const text of [name, String(levelResult.ticks), levelResult.lastHash, levelResult.note]) {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.append(cell);
    }
    element('levels').append(row);
}

function checkLevelSafely(engine: Box2dPhysicsEngine, name: string): LevelResult {
    try {
        return checkLevel(engine, name);
    } catch (error) {
        return { ticks: 0, lastHash: '', result: 'failed', note: `failed: ${String(error)}` };
    }
}

// Lets the browser paint the row just added before the next level runs.
function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
}

async function checkEveryLevel() {
    const engine = new Box2dPhysicsEngine();
    await engine.load();

    let matching = 0;
    for (const name of bundledLevelNames) {
        const levelResult = checkLevelSafely(engine, name);
        if (levelResult.result === 'matches') {
            matching += 1;
        }
        showRow(name, levelResult);
        await nextFrame();
    }

    const summary = element('summary');
    summary.textContent = `${matching} of ${bundledLevelNames.length} levels match their recorded hashes.`;
    summary.dataset['state'] = 'done';
}

void checkEveryLevel();
