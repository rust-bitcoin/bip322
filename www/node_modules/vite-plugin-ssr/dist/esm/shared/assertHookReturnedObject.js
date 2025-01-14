export { assertHookReturnedObject };
import { assert, assertUsage, stringifyStringArray } from './utils.js';
function assertHookReturnedObject(obj, keysExpected, errPrefix) {
    assert(!errPrefix.endsWith(' '));
    const keysUnknown = [];
    const keys = Object.keys(obj);
    for (const key of keys) {
        if (!keysExpected.includes(key)) {
            keysUnknown.push(key);
        }
    }
    assertUsage(keysUnknown.length === 0, [
        errPrefix,
        'returned an object with following unknown keys:',
        stringifyStringArray(keysUnknown) + '.',
        'Only following keys are allowed:',
        stringifyStringArray(keysExpected) + '.'
    ].join(' '));
}
