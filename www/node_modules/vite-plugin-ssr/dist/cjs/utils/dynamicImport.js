"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicImport = void 0;
/** Only works for npm packages, for files use @brillout/import instead */
function dynamicImport(mod) {
    return new Function('mod', 'return import(mod)')(mod);
}
exports.dynamicImport = dynamicImport;
