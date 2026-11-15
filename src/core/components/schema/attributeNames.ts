function labelWords(label: string) {
    const lowercaseLabel = label.toLowerCase();

    return lowercaseLabel.split(' ');
}

// "Linear damping" is linearDamping: the key of the field in code.
export function camelCaseOfLabel(label: string) {
    const [firstWord = '', ...laterWords] = labelWords(label);
    const capitalizedLaterWords = laterWords.map((word) => word.charAt(0).toUpperCase() + word.slice(1));

    return firstWord + capitalizedLaterWords.join('');
}

// "fixedSize" is fixed_size: the key in level.json of a stored value, which has no label.
export function snakeCaseOfKey(key: string) {
    return key.replace(/[A-Z]/g, (capital) => '_' + capital.toLowerCase());
}

// "Linear damping" is linear_damping: the attribute Lua uses and the key in level.json.
export function snakeCaseOfLabel(label: string) {
    const words = labelWords(label);

    return words.join('_');
}
