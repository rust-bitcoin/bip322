export function removeEmptyLines(msg) {
    return msg
        .split('\n')
        .filter((line) => line.trim() !== '')
        .join('\n');
}
