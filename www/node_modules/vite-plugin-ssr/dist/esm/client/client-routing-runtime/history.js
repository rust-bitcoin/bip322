export { initHistoryState, getHistoryState, pushHistory, saveScrollPosition };
import { assert, hasProp, isObject } from './utils.js';
// Fill missing state information.
//  - The very first render => `history.state` is uninitialized (`null`).
//  - The vite-plugin-ssr app runs `location.hash = '#section'` => `history.state` is uninitialized (`null`).
//  - The user clicks on an anchor link `<a href="#section">Section</a>` => `history.state` is uninitialized (`null`).
//  - `history.state` set by an old vite-plugin-ssr version => state information may be incomplete. (E.g. `state.timestamp` was introduced for `pageContext.isBackwardNavigation` in `0.4.19`.)
function initHistoryState() {
    let state = window.history.state;
    if (!state) {
        state = {};
    }
    let hasModifications = false;
    if (!('timestamp' in state)) {
        hasModifications = true;
        state.timestamp = getTimestamp();
    }
    if (!('scrollPosition' in state)) {
        hasModifications = true;
        state.scrollPosition = getScrollPosition();
    }
    assertState(state);
    if (hasModifications) {
        replaceHistoryState(state);
    }
}
function getHistoryState() {
    const state = window.history.state || {};
    assertState(state);
    return state;
}
function getScrollPosition() {
    const scrollPosition = { x: window.scrollX, y: window.scrollY };
    return scrollPosition;
}
function getTimestamp() {
    return new Date().getTime();
}
function saveScrollPosition() {
    const scrollPosition = getScrollPosition();
    const state = getHistoryState();
    replaceHistoryState({ ...state, scrollPosition });
}
function pushHistory(url, overwriteLastHistoryEntry) {
    if (!overwriteLastHistoryEntry) {
        const timestamp = getTimestamp();
        pushHistoryState({ timestamp, scrollPosition: null }, url);
    }
    else {
        replaceHistoryState(getHistoryState(), url);
    }
}
function assertState(state) {
    assert(isObject(state));
    if ('timestamp' in state) {
        const { timestamp } = state;
        assert(typeof timestamp === 'number');
    }
    if ('scrollPosition' in state) {
        const { scrollPosition } = state;
        if (scrollPosition !== null) {
            assert(hasProp(scrollPosition, 'x', 'number') && hasProp(scrollPosition, 'y', 'number'));
        }
    }
}
function replaceHistoryState(state, url) {
    window.history.replaceState(state, '', url ?? /* Passing `undefined` chokes older Edge versions */ null);
}
function pushHistoryState(state, url) {
    window.history.pushState(state, '', url);
}
