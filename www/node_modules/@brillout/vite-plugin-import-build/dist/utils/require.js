"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireResolve = void 0;
const import_1 = require("@brillout/import");
// Workaround for webpack static analysis warnings: (Some users use webpack to bundle their VPS app's server code.)
// ```
// Critical dependency: require function is used in a way in which dependencies cannot be statically extracted
// Critical dependency: the request of a dependency is an expression
// ```
// Just `console.log(require)` already triggers the warnings, so the following seems to be the only way (using eval() shows a warning when using esbuild).
async function requireResolve(id, currentFilename) {
    const req = await getRequire(currentFilename);
    return req.resolve(id);
}
exports.requireResolve = requireResolve;
/* Not needed since using import_() is equivalent
export { require_ }
async function require_(id: string, currentFilename: string) {
  const req = await getRequire(currentFilename)
  return req(id)
}
*/
async function getRequire(currentFilename) {
    const { createRequire } = (await (0, import_1.import_)('module'));
    const req = createRequire(currentFilename);
    return req;
}
/* Debug:
;(async () => {
  console.log('test webpack static analysis suppression trick')
  console.log(await requireResolve('path', __filename))
  console.log(await require_('path'))
})()
//*/
