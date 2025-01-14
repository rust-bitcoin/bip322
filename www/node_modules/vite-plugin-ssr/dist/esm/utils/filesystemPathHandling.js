export { toPosixPath };
export { assertPosixPath };
import { assert } from './assert.js';
function toPosixPath(path) {
    const pathPosix = path.split('\\').join('/');
    assertPosixPath(pathPosix);
    return pathPosix;
}
function assertPosixPath(path) {
    const errMsg = (msg) => `Not a posix path: ${msg}`;
    assert(path !== null, errMsg('null'));
    assert(typeof path === 'string', errMsg(`typeof path === ${JSON.stringify(typeof path)}`));
    assert(path !== '', errMsg('(empty string)'));
    assert(path);
    assert(!path.includes('\\'), errMsg(path));
}
