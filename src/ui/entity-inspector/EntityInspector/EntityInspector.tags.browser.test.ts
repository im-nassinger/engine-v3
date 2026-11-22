import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { TagsComponent } from '../../../core/components/index.ts';
import type { Entity } from '../../../core/level/index.ts';
import { Level } from '../../../core/level/index.ts';
import type { EditorSession } from '../../../editor/session/index.ts';
import {
    addBareEntity,
    closeEntityInspectorPage,
    entityInspectorContainer,
    openEntityInspectorPage,
    requireCard,
    requireElement,
    select,
    showEntityInspector,
} from './testing/entityInspectorPage.ts';

beforeEach(async () => {
    openEntityInspectorPage();
    // Browser test files share one page; a mouse resting over a field would show its tooltip.
    const corner = { x: window.innerWidth - 1, y: window.innerHeight - 1 };
    await userEvent.hover(document.documentElement, { position: corner, force: true });
});

afterEach(() => {
    closeEntityInspectorPage();
});

function addTagged(level: Level, name: string, tags: string[]) {
    const entity = addBareEntity(level, name);
    entity.addComponent(new TagsComponent({ tags }));

    return entity;
}

function tagsOf(entity: Entity) {
    return entity.requireComponent(TagsComponent).get('tags');
}

function tagsField() {
    return requireElement<HTMLElement>(requireCard('TagsComponent'), '.tags-field');
}

function tagsBox() {
    return requireElement<HTMLInputElement>(tagsField(), 'input');
}

function shownTags() {
    const pills = tagsField().querySelectorAll('.tag-pill .text');

    return [...pills].map((pill) => pill.textContent);
}

function shownSuggestions() {
    const choices = tagsField().querySelectorAll('.tag-suggestions .choice');

    return [...choices].map((choice) => choice.textContent);
}

function undoCount(session: EditorSession) {
    return session.openLevel.history.undoCount;
}

async function showEntities(level: Level, entities: readonly Entity[]) {
    const { session } = showEntityInspector(level);
    select(session, entities);
    await expect.poll(() => entityInspectorContainer().querySelector('.tags-field')).not.toBeNull();

    return session;
}

describe('the tags field', () => {
    test('Enter adds the typed tag, made lowercase with `_` for spaces, as one step, and keeps the box', async () => {
        const level = Level.createNew();
        const coin = addTagged(level, 'Coin', ['pickup']);
        const session = await showEntities(level, [coin]);

        await userEvent.click(tagsBox());
        await userEvent.keyboard('Big Coin{Enter}');

        expect(tagsOf(coin)).toEqual(['pickup', 'big_coin']);
        expect(undoCount(session)).toBe(1);
        expect(session.openLevel.history.undoLabel).toBe('Change Tags');
        await expect.poll(shownTags).toEqual(['pickup', 'big_coin']);
        expect(tagsBox().value).toBe('');
        expect(document.activeElement).toBe(tagsBox());
    });

    test('Enter on a tag the entity has, or on nothing left of the text, makes no step', async () => {
        const level = Level.createNew();
        const coin = addTagged(level, 'Coin', ['coin']);
        const session = await showEntities(level, [coin]);

        await userEvent.click(tagsBox());
        await userEvent.keyboard('COIN{Enter}');
        await userEvent.keyboard('!?{Enter}');

        expect(tagsOf(coin)).toEqual(['coin']);
        expect(undoCount(session)).toBe(0);
    });

    test("a tag's × removes it as one step", async () => {
        const level = Level.createNew();
        const coin = addTagged(level, 'Coin', ['coin', 'pickup']);
        const session = await showEntities(level, [coin]);

        const remove = requireElement<HTMLButtonElement>(tagsField(), '[aria-label="Remove tag coin"]');
        await userEvent.click(remove);

        expect(tagsOf(coin)).toEqual(['pickup']);
        expect(undoCount(session)).toBe(1);
        await expect.poll(shownTags).toEqual(['pickup']);
    });

    test("typing offers the level's tags that start with the text, and a click adds one", async () => {
        const level = Level.createNew();
        addTagged(level, 'Player', ['player']);
        addTagged(level, 'Big coin', ['coin', 'coin_big']);
        const coin = addTagged(level, 'Coin', ['coin']);
        const session = await showEntities(level, [coin]);

        await userEvent.click(tagsBox());
        await userEvent.keyboard('Co');
        await expect.poll(shownSuggestions).toEqual(['coin_big']);

        const choice = requireElement<HTMLElement>(tagsField(), '.tag-suggestions .choice');
        await userEvent.click(choice);

        expect(tagsOf(coin)).toEqual(['coin', 'coin_big']);
        expect(undoCount(session)).toBe(1);
        await expect.poll(shownSuggestions).toEqual([]);
        expect(document.activeElement).toBe(tagsBox());
    });

    test('Esc empties the box and adds nothing', async () => {
        const level = Level.createNew();
        const coin = addTagged(level, 'Coin', []);
        await showEntities(level, [coin]);

        await userEvent.click(tagsBox());
        await userEvent.keyboard('enemy{Escape}');

        expect(tagsOf(coin)).toEqual([]);
        expect(tagsBox().value).toBe('');
    });

    test('with entities holding different tags, a tag typed is added to each in one step', async () => {
        const level = Level.createNew();
        const first = addTagged(level, 'First', ['coin']);
        const second = addTagged(level, 'Second', ['enemy']);
        const session = await showEntities(level, [first, second]);

        expect(shownTags()).toEqual([]);
        expect(tagsBox().placeholder).toBe('Mixed');

        await userEvent.click(tagsBox());
        await userEvent.keyboard('spike{Enter}');

        expect(tagsOf(first)).toEqual(['coin', 'spike']);
        expect(tagsOf(second)).toEqual(['enemy', 'spike']);
        expect(undoCount(session)).toBe(1);
    });
});
