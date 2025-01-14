"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setNodeEnvToProduction = exports.getNodeEnv = void 0;
function getNodeEnv() {
    if (typeof process === 'undefined')
        return null;
    return process.env.NODE_ENV;
}
exports.getNodeEnv = getNodeEnv;
function setNodeEnvToProduction() {
    // The statement `process.env['NODE_ENV'] = 'production'` chokes webpack v4
    const proc = process;
    const { env } = proc;
    env.NODE_ENV = 'production';
}
exports.setNodeEnvToProduction = setNodeEnvToProduction;
