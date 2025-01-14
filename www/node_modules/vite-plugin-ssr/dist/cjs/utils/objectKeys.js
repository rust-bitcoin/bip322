"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objectKeys = void 0;
/** Same as Object.keys() but with type inference */
function objectKeys(obj) {
    return Object.keys(obj);
}
exports.objectKeys = objectKeys;
// https://stackoverflow.com/questions/52856496/typescript-object-keys-return-string
// https://github.com/sindresorhus/ts-extras/blob/main/source/object-keys.ts
