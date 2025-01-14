"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserPackageJsonPath = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function findUserPackageJsonPath(userDir) {
    let dir = userDir;
    while (true) {
        const configFilePath = path_1.default.join(dir, './package.json');
        if (fs_1.default.existsSync(configFilePath)) {
            // return toPosixPath(configFilePath)
            return configFilePath;
        }
        const dirPrevious = dir;
        dir = path_1.default.dirname(dir);
        if (dir === dirPrevious) {
            return null;
        }
    }
}
exports.findUserPackageJsonPath = findUserPackageJsonPath;
