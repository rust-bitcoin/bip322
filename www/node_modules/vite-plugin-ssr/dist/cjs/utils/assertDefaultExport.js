"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDefaultExportObject = exports.assertDefaultExportUnknown = void 0;
const assert_js_1 = require("./assert.js");
const isObject_js_1 = require("./isObject.js");
const picocolors_1 = __importDefault(require("@brillout/picocolors"));
const IGNORE = [
    // vite-plugin-solid adds `export { $$registrations }`
    '$$registrations',
    // @vitejs/plugin-vue adds `export { _rerender_only }`
    '_rerender_only'
];
// support `export { frontmatter }` in .mdx files
const FILES_WITH_SIDE_EXPORTS = ['.md', '.mdx'];
function assertDefaultExportUnknown(fileExports, filePath) {
    assertSingleDefaultExport(fileExports, filePath, true);
}
exports.assertDefaultExportUnknown = assertDefaultExportUnknown;
function assertDefaultExportObject(fileExports, filePath) {
    assertSingleDefaultExport(fileExports, filePath, false);
    const exportDefault = fileExports.default;
    (0, assert_js_1.assertUsage)((0, isObject_js_1.isObject)(exportDefault), `The ${picocolors_1.default.cyan('export default')} of ${filePath} should be an object (but it's ${picocolors_1.default.cyan(`typeof exportDefault === ${JSON.stringify(typeof exportDefault)}`)} instead)`);
}
exports.assertDefaultExportObject = assertDefaultExportObject;
function assertSingleDefaultExport(fileExports, filePath, defaultExportValueIsUnknown) {
    const exportsAll = Object.keys(fileExports);
    const exportsRelevant = exportsAll.filter((exportName) => !IGNORE.includes(exportName));
    const exportsInvalid = exportsRelevant.filter((e) => e !== 'default');
    const exportsHasDefault = exportsRelevant.includes('default');
    if (exportsInvalid.length === 0) {
        if (exportsHasDefault) {
            return;
        }
        else {
            (0, assert_js_1.assert)(exportsRelevant.length === 0);
            (0, assert_js_1.assertUsage)(false, `${filePath} doesn't export any value, but it should have a ${picocolors_1.default.cyan('export default')} instead`);
        }
    }
    else if (!FILES_WITH_SIDE_EXPORTS.some((ext) => filePath.endsWith(ext))) {
        if (defaultExportValueIsUnknown) {
            exportsInvalid.forEach((exportInvalid) => {
                (0, assert_js_1.assertWarning)(exportsInvalid.length === 0, `${filePath} should only have a default export: move ${picocolors_1.default.cyan(`export { ${exportInvalid} }`)} to +config.h.js or its own +${exportsInvalid}.js`, { onlyOnce: true });
            });
        }
        else {
            const exportsInvalidStr = exportsInvalid.join(', ');
            (0, assert_js_1.assertWarning)(exportsInvalid.length === 0, `${filePath} replace ${picocolors_1.default.cyan(`export { ${exportsInvalidStr} }`)} with ${picocolors_1.default.cyan(`export default { ${exportsInvalidStr} }`)}`, { onlyOnce: true });
        }
    }
}
