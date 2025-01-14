export function isReactElement(value) {
    return (typeof value === 'object' &&
        value !== null &&
        String(value['$$typeof']) === 'Symbol(react.element)');
}
