export function getValuePrintable(value) {
    if ([null, undefined].includes(value))
        return String(value);
    if (['undefined', 'boolean', 'number', 'string'].includes(typeof value))
        return JSON.stringify(value);
    return null;
}
