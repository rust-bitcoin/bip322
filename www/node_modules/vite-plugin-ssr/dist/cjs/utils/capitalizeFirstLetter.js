"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalizeFirstLetter = void 0;
function capitalizeFirstLetter(word) {
    if (!word[0]) {
        return word;
    }
    return word[0].toUpperCase() + word.slice(1);
}
exports.capitalizeFirstLetter = capitalizeFirstLetter;
