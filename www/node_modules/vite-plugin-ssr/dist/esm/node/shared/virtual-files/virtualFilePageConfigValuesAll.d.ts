export { isVirtualFileIdPageConfigValuesAll };
export { getVirtualFileIdPageConfigValuesAll };
declare const idBase = "virtual:vite-plugin-ssr:pageConfigValuesAll:";
declare function getVirtualFileIdPageConfigValuesAll(pageId: string, isForClientSide: boolean): `${typeof idBase}${string}`;
declare function isVirtualFileIdPageConfigValuesAll(id: string): false | {
    isForClientSide: boolean;
    pageId: string;
    isExtractAssets: boolean;
};
