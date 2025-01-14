"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFilePathToShowToUser = void 0;
const utils_js_1 = require("../../../utils.js");
function getFilePathToShowToUser(filePath) {
    const filePathToShowToUser = filePath.filePathRelativeToUserRootDir ?? filePath.filePathAbsolute;
    (0, utils_js_1.assert)(filePathToShowToUser);
    return filePathToShowToUser;
}
exports.getFilePathToShowToUser = getFilePathToShowToUser;
