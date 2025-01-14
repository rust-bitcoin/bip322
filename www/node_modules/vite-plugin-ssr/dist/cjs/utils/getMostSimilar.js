"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMostSimilar = void 0;
const assert_js_1 = require("./assert.js");
const sorter_js_1 = require("./sorter.js");
const assertIsNotBrowser_js_1 = require("./assertIsNotBrowser.js");
(0, assertIsNotBrowser_js_1.assertIsNotBrowser)();
function getMostSimilar(word, words) {
    if (words.length === 0)
        return null;
    const exactMatch = words.find((w) => w === word);
    if (exactMatch)
        return exactMatch;
    const lowerCaseMatch = words.find((w) => w.toLowerCase() === word.toLowerCase());
    if (lowerCaseMatch)
        return lowerCaseMatch;
    const mostSimilar = words
        .map((w) => ({
        word: w,
        similarity: getSimilarity(w, word)
    }))
        .sort((0, sorter_js_1.higherFirst)(({ similarity }) => similarity))[0];
    (0, assert_js_1.assert)(mostSimilar);
    if (mostSimilar.similarity >= 0.8) {
        return mostSimilar.word;
    }
    else {
        return null;
    }
}
exports.getMostSimilar = getMostSimilar;
// https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely/36566052#36566052
function getSimilarity(s1, s2) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
        longer = s2;
        shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
        return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / longerLength;
}
function editDistance(s1, s2) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
        var lastValue = i;
        for (var j = 0; j <= s2.length; j++) {
            if (i == 0)
                costs[j] = j;
            else {
                if (j > 0) {
                    var newValue = costs[j - 1];
                    if (s1.charAt(i - 1) != s2.charAt(j - 1))
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
        }
        if (i > 0)
            costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}
