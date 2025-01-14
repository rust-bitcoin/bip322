"use strict";
// TODO/v1-release: remove this
Object.defineProperty(exports, "__esModule", { value: true });
exports.forbiddenDefaultExports = exports.assertExportValues = exports.assertDefaultExports = void 0;
const utils_js_1 = require("../utils.js");
const enforceTrue = ['clientRouting'];
function assertExportValues(pageFile) {
    enforceTrue.forEach((exportName) => {
        (0, utils_js_1.assert)(pageFile.fileExports);
        if (!(exportName in pageFile.fileExports))
            return;
        const explainer = `The value of \`${exportName}\` is only allowed to be \`true\`.`;
        (0, utils_js_1.assertUsage)(pageFile.fileExports[exportName] !== false, `${pageFile.filePath} has \`export { ${exportName} }\` with the value \`false\` which is prohibited: remove \`export { ${exportName} }\` instead. (${explainer})`);
        (0, utils_js_1.assertUsage)(pageFile.fileExports[exportName] === true, `${pageFile.filePath} has \`export { ${exportName} }\` with a forbidden value. ${explainer}`);
    });
}
exports.assertExportValues = assertExportValues;
// Forbid exports such as `export default { render }`, because only `export { render }` can be statically analyzed by `es-module-lexer`.
const forbiddenDefaultExports = ['render', 'clientRouting', 'prerender', 'doNotPrerender'];
exports.forbiddenDefaultExports = forbiddenDefaultExports;
function assertDefaultExports(defaultExportName, filePath) {
    (0, utils_js_1.assertUsage)(!forbiddenDefaultExports.includes(defaultExportName), `${filePath} has \`export default { ${defaultExportName} }\` which is prohibited, use \`export { ${defaultExportName} }\` instead.`);
}
exports.assertDefaultExports = assertDefaultExports;
