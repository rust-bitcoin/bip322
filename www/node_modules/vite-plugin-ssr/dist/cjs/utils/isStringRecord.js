"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStringRecord = void 0;
function isStringRecord(thing) {
    return typeof thing === 'object' && thing !== null && Object.values(thing).every((val) => typeof val === 'string');
}
exports.isStringRecord = isStringRecord;
