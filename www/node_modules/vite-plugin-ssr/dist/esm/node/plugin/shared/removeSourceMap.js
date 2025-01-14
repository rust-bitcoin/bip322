export { removeSourceMap };
function removeSourceMap(code) {
    return {
        code,
        // Remove Source Map to save KBs
        //  - https://rollupjs.org/guide/en/#source-code-transformations
        map: { mappings: '' }
    };
}
