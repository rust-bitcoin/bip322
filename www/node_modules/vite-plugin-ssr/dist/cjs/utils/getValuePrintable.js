"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValuePrintable = void 0;
function getValuePrintable(value) {
    if ([null, undefined].includes(value))
        return String(value);
    if (['undefined', 'boolean', 'number', 'string'].includes(typeof value))
        return JSON.stringify(value);
    return null;
}
exports.getValuePrintable = getValuePrintable;
