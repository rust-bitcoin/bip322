export { navigate };
export { reload };
export { defineNavigate };
/** Programmatically navigate to a new page.
 *
 * https://vite-plugin-ssr.com/navigate
 *
 * @param url - The URL of the new page.
 * @param keepScrollPosition - Don't scroll to the top of the page, instead keep the current scroll position.
 * @param overwriteLastHistoryEntry - Don't create a new entry in the browser's history, instead let the new URL replace the current URL. (This effectively removes the current URL from the browser history).
 */
declare function navigate(url: string, { keepScrollPosition, overwriteLastHistoryEntry }?: {
    keepScrollPosition?: boolean | undefined;
    overwriteLastHistoryEntry?: boolean | undefined;
}): Promise<void>;
declare function defineNavigate(navigate_: typeof navigate): void;
declare function reload(): Promise<void>;
