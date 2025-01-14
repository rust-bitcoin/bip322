export function isStringRecord(thing) {
    return typeof thing === 'object' && thing !== null && Object.values(thing).every((val) => typeof val === 'string');
}
