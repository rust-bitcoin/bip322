"use strict";
// Utils needed by all runtimes:
//  - runtime of server
//  - runtime of client (Server Routing)
//  - runtime of client (Client Routing)
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
__exportStar(require("../utils/assert.js"), exports);
__exportStar(require("../utils/parseUrl.js"), exports);
__exportStar(require("../utils/objectAssign.js"), exports);
__exportStar(require("../utils/isCallable.js"), exports);
__exportStar(require("../utils/isObject.js"), exports);
__exportStar(require("../utils/unique.js"), exports);
__exportStar(require("../utils/slice.js"), exports);
__exportStar(require("../utils/sorter.js"), exports);
__exportStar(require("../utils/isBrowser.js"), exports);
__exportStar(require("../utils/hasProp.js"), exports);
__exportStar(require("../utils/isPlainObject.js"), exports);
__exportStar(require("../utils/compareString.js"), exports);
__exportStar(require("../utils/isNotNullish.js"), exports);
__exportStar(require("../utils/stringifyStringArray.js"), exports);
__exportStar(require("../utils/filesystemPathHandling.js"), exports);
__exportStar(require("../utils/cast.js"), exports);
__exportStar(require("../utils/projectInfo.js"), exports);
__exportStar(require("../utils/hasPropertyGetter.js"), exports);
__exportStar(require("../utils/isPromise.js"), exports);
__exportStar(require("../utils/checkType.js"), exports);
__exportStar(require("../utils/assertDefaultExport.js"), exports);
__exportStar(require("../utils/objectEntries.js"), exports);
__exportStar(require("../utils/getValuePrintable.js"), exports);
