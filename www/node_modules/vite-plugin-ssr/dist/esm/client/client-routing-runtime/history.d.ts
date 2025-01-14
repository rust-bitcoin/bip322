export { initHistoryState, getHistoryState, pushHistory, ScrollPosition, saveScrollPosition };
type HistoryState = {
    timestamp?: number;
    scrollPosition?: null | ScrollPosition;
};
type ScrollPosition = {
    x: number;
    y: number;
};
declare function initHistoryState(): void;
declare function getHistoryState(): HistoryState;
declare function saveScrollPosition(): void;
declare function pushHistory(url: string, overwriteLastHistoryEntry: boolean): void;
