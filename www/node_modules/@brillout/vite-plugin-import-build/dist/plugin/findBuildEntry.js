"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBuildEntry = void 0;
const utils_1 = require("./utils");
function findBuildEntry(entryName, rollupBundle, config) {
    let entryFound;
    const entries = Object.keys(rollupBundle);
    for (const name of entries) {
        if (name.endsWith('.map'))
            continue; // https://github.com/brillout/vite-plugin-ssr/issues/612
        (0, utils_1.assert)(!entryName.includes('.'));
        (0, utils_1.assert)(!entryName.includes('-'));
        const nameWithoutHash = name.split('.')[0].split('-')[0];
        if (entryName === nameWithoutHash) {
            (0, utils_1.assert)(!entryFound);
            entryFound = name;
        }
    }
    if (!entryFound) {
        const entriesStr = entries.map((e) => `'${e}'`).join(', ');
        (0, utils_1.assertUsage)(false, `Cannot find server build entry '${entryName}'. Make sure your Rollup config doesn't change the entry name '${entryName}' of your server build ${config.build.outDir}. (Found server build entries: [${entriesStr}].)`);
    }
    return entryFound;
}
exports.findBuildEntry = findBuildEntry;
