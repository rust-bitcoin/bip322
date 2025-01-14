export function removeFileExtention(filePath) {
    return filePath.split('.').slice(0, -1).join('.');
}
