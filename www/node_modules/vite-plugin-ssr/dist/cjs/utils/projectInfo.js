"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectInfo = void 0;
const assertSingleInstance_js_1 = require("./assertSingleInstance.js");
const PROJECT_VERSION = '0.4.142';
const projectInfo = {
    projectName: 'vite-plugin-ssr',
    projectVersion: PROJECT_VERSION,
    npmPackageName: 'vite-plugin-ssr',
    githubRepository: 'https://github.com/brillout/vite-plugin-ssr'
};
exports.projectInfo = projectInfo;
// Trick: since `utils/asserts.ts` depends on this file (`utils/projectInfo.ts`), we can have confidence that this file is always instantiated. So that we don't have to initialize this code snippet at every possible entry. (There are a *lot* of entries: `client/router/`, `client/`, `node/`, `node/plugin/`, `node/cli`, etc.)
(0, assertSingleInstance_js_1.onProjectInfo)(projectInfo.projectVersion);
