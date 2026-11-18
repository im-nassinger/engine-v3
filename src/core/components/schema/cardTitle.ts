import type { ComponentTypeName } from '../ComponentTypeName.ts';

const NAME_ENDING = 'Component';

// What a component's card is called on screen: `Body` for the BodyComponent. The file, the glossary and
// Lua keep the full name.
export function cardTitle(typeName: ComponentTypeName) {
    const titleLength = typeName.length - NAME_ENDING.length;

    return typeName.slice(0, titleLength);
}
