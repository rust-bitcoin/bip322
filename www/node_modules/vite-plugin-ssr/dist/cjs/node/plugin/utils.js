"use strict";
// Utils needed by vite-plugin-ssr's Vite plugin.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// We assume all runtime entries will load this utils.ts file
const onLoad_js_1 = require("./onLoad.js");
(0, onLoad_js_1.onLoad)();
// We tolerate the fact that we load all of the runtime utils even though some of it isn't needed
__exportStar(require("../runtime/utils.js"), exports);
// Utils only needed by `plugin/*`
__exportStar(require("../../utils/viteIsSSR.js"), exports);
__exportStar(require("../../utils/getFilePathAbsolute.js"), exports);
__exportStar(require("../../utils/getDependencyPackageJson.js"), exports);
__exportStar(require("../../utils/addFileExtensionsToRequireResolve.js"), exports);
__exportStar(require("../../utils/assertDefaultExport.js"), exports);
__exportStar(require("../../utils/arrayIncludes.js"), exports);
__exportStar(require("../../utils/isDev.js"), exports);
__exportStar(require("../../utils/objectKeys.js"), exports);
__exportStar(require("../../utils/getMostSimilar.js"), exports);
__exportStar(require("../../utils/getRandomId.js"), exports);
__exportStar(require("../../utils/joinEnglish.js"), exports);
__exportStar(require("../../utils/escapeRegex.js"), exports);
__exportStar(require("../../utils/stripAnsi.js"), exports);
__exportStar(require("../../utils/trimWithAnsi.js"), exports);
__exportStar(require("../../utils/removeEmptyLines.js"), exports);
__exportStar(require("../../utils/findUserPackageJsonPath.js"), exports);
__exportStar(require("../../utils/getPropAccessNotation.js"), exports);
__exportStar(require("../../utils/mergeCumulativeValues.js"), exports);
